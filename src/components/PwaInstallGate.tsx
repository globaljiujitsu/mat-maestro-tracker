import { useEffect, useState, type ReactNode } from "react";
import {
  isStandalone,
  isIos,
  isAndroid,
  isMobile,
  type BeforeInstallPromptEvent,
} from "@/lib/pwa";
import { Share, Plus, Download, Smartphone } from "lucide-react";

interface Props {
  children: ReactNode;
}

/**
 * Full-screen, un-bypassable install gate for first-time mobile web visits.
 * Desktop browsers pass through (gym staff may use desktop admin).
 */
export function PwaInstallGate({ children }: Props) {
  const [ready, setReady] = useState(false);
  const [installed, setInstalled] = useState(true);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const standalone = isStandalone();
    const mobile = isMobile();
    // Allow desktop through; only gate on mobile web
    setInstalled(standalone || !mobile);
    setReady(true);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const installedHandler = () => setInstalled(true);
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  if (!ready) return null;
  if (installed) return <>{children}</>;

  const ios = isIos();
  const android = isAndroid();

  const handleInstall = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setDeferred(null);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-gradient-midnight safe-top safe-bottom">
      <div className="bg-hero absolute inset-0 -z-10" />
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="mb-10 flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-gold shadow-gold">
          <Smartphone className="h-12 w-12 text-primary-foreground" strokeWidth={1.5} />
        </div>

        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
          Global Jiu-Jitsu
        </p>
        <h1 className="mb-4 text-3xl font-bold text-foreground">
          Agrega <span className="text-gradient-gold">Global Jiu-Jitsu</span> a tu pantalla de inicio
        </h1>
        <p className="mb-10 max-w-sm text-sm leading-relaxed text-muted-foreground">
          Para una mejor experiencia, instala la aplicación como un acceso nativo en tu dispositivo.
        </p>

        {ios && (
          <div className="w-full max-w-sm space-y-3 rounded-2xl border border-border bg-surface p-5 text-left shadow-elevated">
            <p className="text-sm font-semibold text-foreground">Instrucciones para iPhone</p>
            <ol className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">1</span>
                <span className="flex items-center gap-1.5">
                  Toca el ícono <Share className="inline h-4 w-4 text-primary" /> compartir
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">2</span>
                <span className="flex items-center gap-1.5">
                  Selecciona <Plus className="inline h-4 w-4 text-primary" /> "Agregar a inicio"
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">3</span>
                <span>Abre la app desde tu pantalla principal</span>
              </li>
            </ol>
          </div>
        )}

        {android && (
          <div className="w-full max-w-sm space-y-4">
            {deferred ? (
              <button
                onClick={handleInstall}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-gold px-6 py-4 text-base font-bold text-primary-foreground shadow-gold transition-liquid active:scale-[0.98]"
              >
                <Download className="h-5 w-5" />
                Instalar Aplicación
              </button>
            ) : (
              <div className="rounded-2xl border border-border bg-surface p-5 text-left">
                <p className="mb-3 text-sm font-semibold text-foreground">Cómo instalar</p>
                <ol className="space-y-2 text-sm text-muted-foreground">
                  <li>1. Abre el menú del navegador (⋮)</li>
                  <li>2. Toca "Agregar a pantalla de inicio" o "Instalar app"</li>
                  <li>3. Abre la app desde tu pantalla principal</li>
                </ol>
              </div>
            )}
          </div>
        )}

        {!ios && !android && (
          <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-5 text-sm text-muted-foreground">
            Abre esta aplicación desde tu teléfono móvil para una experiencia óptima.
          </div>
        )}
      </div>
    </div>
  );
}
