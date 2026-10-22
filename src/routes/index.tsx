import { createFileRoute, redirect } from "@tanstack/react-router";

// No public website: the app opens straight to sign-in.
export const Route = createFileRoute("/")({
  beforeLoad: () => { throw redirect({ to: "/login" }); },
  head: () => ({
    meta: [
      { title: "AbanRemit — Sign in" },
      { name: "description", content: "Sign in or create your AbanRemit wallet (demo)." },
      { property: "og:title", content: "AbanRemit — Sign in" },
      { property: "og:description", content: "Sign in or create your AbanRemit wallet (demo)." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
