import { createFileRoute } from "@tanstack/react-router";
import { runStudentOfMonth } from "@/lib/certificates.functions";

export const Route = createFileRoute("/api/public/hooks/student-of-month")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey");
        if (apikey !== process.env.SUPABASE_PUBLISHABLE_KEY) {
          return new Response("Unauthorized", { status: 401 });
        }
        const result = await runStudentOfMonth();
        return Response.json(result);
      },
    },
  },
});
