import { useEffect, useState } from "react";
import { Bell, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

type Notif = { id: string; title: string; body: string | null; is_read: boolean; created_at: string };

export function NotificationsBell() {
  const { user } = useAuth();
  const userId = user?.id;
  const [items, setItems] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let active = true;

    const load = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, title, body, is_read, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30);
      if (active) setItems(data ?? []);
    };
    load();

    const channel = supabase
      .channel(`notif-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const n = payload.new as Notif;
          setItems((prev) => [n, ...prev].slice(0, 30));
          toast(n.title, { description: n.body ?? undefined });
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const unread = items.filter((n) => !n.is_read).length;

  const markAll = async () => {
    if (!userId || unread === 0) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notificaciones"
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-foreground transition-liquid hover:border-primary/60 hover:text-primary"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-50 w-80 max-w-[92vw] overflow-hidden rounded-2xl border border-border bg-surface shadow-elevated">
            <div className="flex items-center justify-between border-b border-border px-4 py-2">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">Notificaciones</p>
              <div className="flex items-center gap-1">
                {unread > 0 && (
                  <button onClick={markAll} className="rounded-full border border-border px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground hover:text-primary">
                    <Check className="inline h-3 w-3" /> Leer
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="rounded-full p-1 text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <ul className="max-h-96 divide-y divide-border overflow-y-auto">
              {items.length === 0 && (
                <li className="px-4 py-6 text-center text-xs text-muted-foreground">Sin notificaciones.</li>
              )}
              {items.map((n) => (
                <li key={n.id} className={`px-4 py-3 ${!n.is_read ? "bg-primary/5" : ""}`}>
                  <p className="text-sm font-semibold text-foreground">{n.title}</p>
                  {n.body && <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>}
                  <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {format(parseISO(n.created_at), "d MMM HH:mm", { locale: es })}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
