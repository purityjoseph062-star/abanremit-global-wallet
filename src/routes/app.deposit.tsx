import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/portal-shell";
import { MovementWizard } from "@/components/movement-wizard";

export const Route = createFileRoute("/app/deposit")({
  head: () => ({
    meta: [
      { title: "Add money — AbanRemit (demo)" },
      {
        name: "description",
        content: "Add money to your AbanRemit wallet by mobile money, bank, card or agent.",
      },
      { property: "og:title", content: "Add money — AbanRemit" },
      { property: "og:description", content: "Fund your wallet with transparent fees." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <>
      <PageHeader title="Add money" desc="Fees and processing time shown before you commit." />
      <MovementWizard kind="deposit" />
    </>
  ),
});
