# Al-Burhan ERP: Web

Next.js 16 · React 19 · Tailwind CSS 4. This is the ERP web app; the POS web app will follow the
same design system. It talks to the Django backend (`Alburhan-Backend`) through its own
`/api/v1` proxy, so login tokens stay in httpOnly cookies.

```bash
npm install
cp .env.example .env.local     # BACKEND_URL=http://localhost:8000
npm run dev                    # http://localhost:3000
```

| Path | What |
|---|---|
| `src/app/(auth)/login` | Sign in |
| `src/app/(app)/overview` | Home |
| `src/app/(app)/settings/*` | Companies, branches, warehouses, exchange rates, users (with role assignments), roles (with permissions) |
| `src/components/ui.tsx` | Design-system primitives (see `.claude/skills/alburhan-ui`) |
| `src/components/resource-page.tsx` | List + slide-in form used by settings screens |
| `src/lib/workspace.tsx` | Current company/branch, language, `can()` permission checks |
| `src/lib/server/session.ts`, `src/app/api/**` | Cookie session and the proxy to Django |
