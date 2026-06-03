import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState } from "@/components/EmptyState";
import { CalendarDays, MapPin, Users, Check, X, Loader2 } from "lucide-react";
import { format, parseISO, isToday, isTomorrow, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/student/classes")({
  component: ClassesPage,
});

function ClassesPage() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const qc = useQueryClient();
  const [tab, setTab] = useState<"available" | "mine">("available");

  const today = new Date();
  const endRange = addDays(today, 14).toISOString().slice(0, 10);

  const { data: classes, isLoading } = useQuery({
    queryKey: ["classes-range", today.toISOString().slice(0, 10), endRange],
    queryFn: async () => {
      const { data } = await supabase
        .from("classes")
        .select("*, branches(name)")
        .gte("date", today.toISOString().slice(0, 10))
        .lte("date", endRange)
        .eq("status", "scheduled")
        .order("date")
        .order("time");
      const rows = data ?? [];
      const ids = Array.from(new Set(rows.map((c) => c.instructor_id).filter(Boolean)));
      const profs = ids.length
        ? (await supabase.from("profiles").select("id, full_name").in("id", ids)).data ?? []
        : [];
      const pm = new Map(profs.map((p) => [p.id, p.full_name]));
      return rows.map((c) => ({ ...c, instructor_name: pm.get(c.instructor_id) ?? null }));
    },
  });

  const { data: bookings } = useQuery({
    queryKey: ["my-bookings", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance")
        .select("id, class_id, booking_status")
        .eq("student_id", userId);
      return data ?? [];
    },
  });

  const bookingByClass = new Map(bookings?.map((b) => [b.class_id, b]));

  const book = useMutation({
    mutationFn: async (classId: string) => {
      const existing = bookingByClass.get(classId);
      if (existing) {
        const { error } = await supabase
          .from("attendance")
          .update({ booking_status: "confirmed" })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("attendance")
          .insert({ class_id: classId, student_id: userId, booking_status: "confirmed" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("¡Clase reservada!");
      qc.invalidateQueries({ queryKey: ["my-bookings"] });
      qc.invalidateQueries({ queryKey: ["upcoming-bookings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancel = useMutation({
    mutationFn: async (classId: string) => {
      const existing = bookingByClass.get(classId);
      if (!existing) return;
      const { error } = await supabase
        .from("attendance")
        .update({ booking_status: "cancelled" })
        .eq("id", existing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Reserva cancelada");
      qc.invalidateQueries({ queryKey: ["my-bookings"] });
      qc.invalidateQueries({ queryKey: ["upcoming-bookings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const visible = (classes ?? []).filter((c) =>
    tab === "available" ? true : bookingByClass.get(c.id)?.booking_status === "confirmed",
  );

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Agenda</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-foreground">Clases</h1>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-surface p-1">
        {(["available", "mine"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-xl py-2 text-xs font-bold uppercase tracking-wider transition-liquid ${
              tab === t ? "bg-gradient-gold text-primary-foreground shadow-gold" : "text-muted-foreground"
            }`}
          >
            {t === "available" ? "Disponibles" : "Mis reservas"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={tab === "available" ? "Sin clases programadas" : "Sin reservas activas"}
          description={tab === "available" ? "No hay clases en los próximos 14 días." : "Reserva una clase desde la pestaña Disponibles."}
        />
      ) : (
        <ul className="space-y-3">
          {visible.map((c) => {
            const booked = bookingByClass.get(c.id)?.booking_status === "confirmed";
            const d = parseISO(c.date);
            const dayLabel = isToday(d) ? "Hoy" : isTomorrow(d) ? "Mañana" : format(d, "EEE d 'de' MMM", { locale: es });
            return (
              <li key={c.id} className="overflow-hidden rounded-2xl border border-border bg-surface shadow-elevated">
                <div className="flex items-center gap-2 border-b border-border/60 bg-surface-elevated/50 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-primary">
                  <CalendarDays className="h-3 w-3" /> {dayLabel} · {c.time.slice(0, 5)}
                </div>
                <div className="p-4">
                  <p className="font-display text-lg font-semibold text-foreground">{c.title}</p>
                  {c.description && <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>}
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{c.branches?.name ?? "—"}</span>
                    <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />Cap. {c.max_capacity}</span>
                  </div>
                  <div className="mt-4">
                    {booked ? (
                      <button
                        onClick={() => cancel.mutate(c.id)}
                        disabled={cancel.isPending}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 py-2.5 text-sm font-bold text-destructive transition-liquid hover:bg-destructive/20 disabled:opacity-60"
                      >
                        <X className="h-4 w-4" /> Cancelar reserva
                      </button>
                    ) : (
                      <button
                        onClick={() => book.mutate(c.id)}
                        disabled={book.isPending}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-gold py-2.5 text-sm font-bold text-primary-foreground shadow-gold transition-liquid disabled:opacity-60"
                      >
                        <Check className="h-4 w-4" /> Reservar clase
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
