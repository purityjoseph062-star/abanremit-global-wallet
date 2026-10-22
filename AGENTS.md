<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Screens call only the typed `api` from src/lib/api; DemoApiAdapter simulates server rules (fees, idempotency, ledger) and LaravelApiAdapter targets /api/v1 with no demo fallback — keeps demo and production swappable via VITE_API_MODE.
- Money is integer minor units with per-currency precision (src/lib/money.ts) — avoids float errors.
- Portal routes guard with requirePermission in beforeLoad (ssr: false, demo state lives in browser storage); Laravel must enforce the same permissions.
