# Al-Burhan ERP: web frontend

- **Before any UI work, load the `alburhan-ui` skill** (`.claude/skills/alburhan-ui/`). Every
  screen must use its tokens, components, layout and motion, and work in Arabic (RTL).
- This is Next.js 16 with breaking changes. Read the guide in `node_modules/next/dist/docs/`
  before using a Next API.
- The browser only calls `/api/v1/*` and `/api/session/*` on this app. Next.js forwards them to
  Django (`BACKEND_URL`) with the JWT taken from httpOnly cookies. Never expose tokens to client code.
- New UI text goes through `t("English text")`; add the Arabic in `src/lib/i18n.ts`.
- Show actions with `useWorkspace().can("<app>.<thing>.<verb>")`. The backend enforces the
  same permissions.
- Checks: `npx tsc --noEmit`, `npx eslint`, `npx next build`.
