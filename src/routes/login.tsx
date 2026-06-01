import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { BrandLogo } from "@/components/BrandLogo";
import { Loader2, Mail, Lock, User as UserIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Iniciar Sesión — Global Jiu-Jitsu" },
      { name: "description", content: "Accede a tu cuenta de Global Jiu-Jitsu." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [needsBootstrap, setNeedsBootstrap] = useState<boolean | null>(null);

  // Detect if no admin exists yet → show one-time "create first admin" form
  useEffect(() => {
    supabase.rpc("admin_exists").then(({ data }) => {
      setNeedsBootstrap(!data);
    });
  }, []);

  if (!authLoading && user) return <Navigate to="/" />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (needsBootstrap) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName || email },
          },
        });
        if (error) throw error;
        toast.success("Cuenta de administrador creada");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Sesión iniciada");
      }
      navigate({ to: "/" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error de autenticación";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-midnight safe-top safe-bottom">
      <div className="bg-hero pointer-events-none absolute inset-0 -z-10" />

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-10">
        <div className="mb-10">
          <BrandLogo size="lg" />
        </div>

        <div className="w-full max-w-sm rounded-3xl border border-border bg-surface/80 p-7 shadow-elevated backdrop-blur-xl">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
              {needsBootstrap ? "Configuración inicial" : "Bienvenido"}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-foreground">
              {needsBootstrap ? "Crear administrador" : "Inicia sesión"}
            </h1>
            {needsBootstrap && (
              <p className="mt-2 text-xs text-muted-foreground">
                Esta es la primera cuenta y será el administrador de la academia.
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {needsBootstrap && (
              <Field
                icon={<UserIcon className="h-4 w-4" />}
                placeholder="Nombre completo"
                value={fullName}
                onChange={setFullName}
                required
              />
            )}
            <Field
              icon={<Mail className="h-4 w-4" />}
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={setEmail}
              required
            />
            <Field
              icon={<Lock className="h-4 w-4" />}
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={setPassword}
              required
              minLength={8}
            />

            <button
              type="submit"
              disabled={submitting || needsBootstrap === null}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-gold py-3.5 text-sm font-bold text-primary-foreground shadow-gold transition-liquid active:scale-[0.98] disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {needsBootstrap ? "Crear administrador" : "Iniciar sesión"}
            </button>
          </form>

          {!needsBootstrap && (
            <p className="mt-6 text-center text-xs text-muted-foreground">
              ¿No tienes cuenta? Solicítala a tu administrador.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  icon,
  ...props
}: {
  icon: React.ReactNode;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
        {icon}
      </span>
      <input
        type={props.type ?? "text"}
        placeholder={props.placeholder}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        required={props.required}
        minLength={props.minLength}
        className="h-12 w-full rounded-xl border border-border bg-background pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}
