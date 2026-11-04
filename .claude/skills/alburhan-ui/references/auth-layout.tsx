import { Brand } from "@/components/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <aside className="hidden flex-col justify-between bg-panel p-10 text-panel-ink lg:flex">
        <Brand />
        <div className="max-w-sm">
          <p className="text-3xl leading-tight font-semibold tracking-tight">
            Keep your day, your team, and your services in one calm place.
          </p>
          <p className="mt-4 text-sm text-panel-ink-soft">
            Set up your business once, and everyone works from the same picture.
          </p>
        </div>
        <p className="text-xs text-panel-ink-soft">Built for appointment-led businesses</p>
      </aside>
      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
