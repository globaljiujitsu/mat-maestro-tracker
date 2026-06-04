import { createServerFn } from "@tanstack/react-start";

type TopRow = {
  student_id: string;
  full_name: string | null;
  branch_id: string | null;
  branch_name: string | null;
  hours: number;
  classes_count: number;
};

/**
 * Generates the "Estudiante del mes" certificate for the top student of the previous month
 * for every branch (and the global top). Stores the PDF in the certificates bucket and
 * inserts a certificates row + a notification for the winner.
 *
 * Idempotent: if a certificate of the same type and metadata.month exists for the
 * student it is skipped.
 */
export const runStudentOfMonth = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");

  // Use previous month (run on day 1)
  const now = new Date();
  const monthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const monthIso = monthDate.toISOString().slice(0, 10);
  const monthKey = monthIso.slice(0, 7); // YYYY-MM

  // Collect winners: top1 per branch + global top1
  const winners: Array<TopRow & { scope: string }> = [];

  const { data: branches } = await supabaseAdmin.from("branches").select("id, name");
  for (const b of branches ?? []) {
    const { data } = await supabaseAdmin.rpc("monthly_top_students", {
      _month: monthIso,
      _branch_id: b.id,
      _limit: 1,
    });
    const row = (data ?? [])[0] as TopRow | undefined;
    if (row && row.hours > 0) winners.push({ ...row, scope: `Sucursal ${row.branch_name ?? b.name}` });
  }

  const { data: global } = await supabaseAdmin.rpc("monthly_top_students", {
    _month: monthIso,
    _branch_id: null,
    _limit: 1,
  });
  const g = (global ?? [])[0] as TopRow | undefined;
  if (g && g.hours > 0) winners.push({ ...g, scope: "Global" });

  const created: string[] = [];
  for (const w of winners) {
    // Skip if already issued
    const { data: existing } = await supabaseAdmin
      .from("certificates")
      .select("id")
      .eq("student_id", w.student_id)
      .eq("type", "student_of_month")
      .contains("metadata", { month: monthKey, scope: w.scope })
      .maybeSingle();
    if (existing) continue;

    // Build PDF
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([842, 595]); // A4 landscape
    const font = await pdf.embedFont(StandardFonts.HelveticaBold);
    const body = await pdf.embedFont(StandardFonts.Helvetica);
    const gold = rgb(0.83, 0.68, 0.21);
    const dark = rgb(0.07, 0.09, 0.15);

    page.drawRectangle({ x: 0, y: 0, width: 842, height: 595, color: dark });
    page.drawRectangle({ x: 24, y: 24, width: 794, height: 547, borderColor: gold, borderWidth: 2 });

    page.drawText("GLOBAL JIU-JITSU", { x: 280, y: 510, size: 22, font, color: gold });
    page.drawText("CERTIFICADO", { x: 310, y: 460, size: 32, font, color: rgb(1, 1, 1) });
    page.drawText("Estudiante del Mes", { x: 290, y: 420, size: 20, font: body, color: gold });

    const name = w.full_name ?? "Atleta";
    const nameWidth = font.widthOfTextAtSize(name, 36);
    page.drawText(name, { x: (842 - nameWidth) / 2, y: 330, size: 36, font, color: rgb(1, 1, 1) });

    const monthLabel = monthDate.toLocaleDateString("es-CL", { month: "long", year: "numeric" });
    const subtitle = `${w.scope} · ${monthLabel}`;
    const subW = body.widthOfTextAtSize(subtitle, 16);
    page.drawText(subtitle, { x: (842 - subW) / 2, y: 285, size: 16, font: body, color: rgb(0.85, 0.85, 0.85) });

    const stats = `${Number(w.hours).toFixed(1)} horas · ${w.classes_count} clases`;
    const sW = body.widthOfTextAtSize(stats, 14);
    page.drawText(stats, { x: (842 - sW) / 2, y: 240, size: 14, font: body, color: gold });

    const footer = "Por su compromiso y dedicación al arte suave.";
    const fW = body.widthOfTextAtSize(footer, 12);
    page.drawText(footer, { x: (842 - fW) / 2, y: 150, size: 12, font: body, color: rgb(0.7, 0.7, 0.7) });

    const bytes = await pdf.save();
    const path = `${w.student_id}/${monthKey}-${w.scope.replace(/\s+/g, "_")}.pdf`;
    const { error: upErr } = await supabaseAdmin.storage
      .from("certificates")
      .upload(path, bytes, { contentType: "application/pdf", upsert: true });
    if (upErr) {
      console.error("upload error", upErr);
      continue;
    }
    const { data: pub } = supabaseAdmin.storage.from("certificates").getPublicUrl(path);

    await supabaseAdmin.from("certificates").insert({
      student_id: w.student_id,
      type: "student_of_month",
      pdf_url: pub.publicUrl,
      metadata: { month: monthKey, scope: w.scope, hours: w.hours, classes: w.classes_count },
    });

    await supabaseAdmin.from("notifications").insert({
      user_id: w.student_id,
      title: "¡Eres Estudiante del Mes!",
      body: `${w.scope} · ${monthLabel}. Tu certificado ya está disponible.`,
    });

    created.push(path);
  }

  return { ok: true, count: created.length, created };
});
