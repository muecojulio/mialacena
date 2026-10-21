import { createFileRoute } from "@tanstack/react-router";
import { PrivacidadView } from "@/components/view-privacidad";

export const Route = createFileRoute("/privacidad")({ component: PrivacidadPage });

function PrivacidadPage() {
  return (
    <main className="min-h-screen text-ink">
      <div className="safe-top mx-auto max-w-lg px-4 pb-16 pt-4">
        <PrivacidadView standalone />
      </div>
    </main>
  );
}
