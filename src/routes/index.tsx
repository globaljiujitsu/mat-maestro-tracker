import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { BrandLogo } from "@/components/BrandLogo";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Global Jiu-Jitsu" },
      { name: "description", content: "Tu academia premium de BJJ en Chile." },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-midnight">
        <BrandLogo size="lg" />
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;

  if (role === "admin") return <Navigate to="/admin" />;
  if (role === "instructor") return <Navigate to="/instructor" />;
  return <Navigate to="/student" />;
}
