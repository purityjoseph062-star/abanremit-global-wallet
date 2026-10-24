import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/portal-shell";
import { MovementWizard } from "@/components/movement-wizard";

export const Route = createFileRoute("/app/withdraw")({
  head: () => ({
    meta: [
      { title: "Withdraw — AbanRemit (demo)" },
      {
        name: "description",
        content: "Withdraw from your AbanRemit wallet to mobile money, a bank or an agent.",
      },
      { property: "og:title", content: "Withdraw — AbanRemit" },
      { property: "og:description", content: "Cash out with the full cost shown upfront." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <>
      <PageHeader
        title="Withdraw"
        desc="The fee is added on top — the recipient gets the full amount."
      />
      <MovementWizard kind="withdrawal" />
    </>
  ),
});
