import { CountrySlides } from "@/components/country-slides";

/**
 * Sign-in layout: the form on white at the start; at the end the group's countries in a slow
 * slideshow, behind a soft curved edge (mirrored in Arabic), as in the reference design.
 * Photos live in public/auth/ (portrait, 1200 × 1800).
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-surface lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex min-h-dvh flex-col">{children}</div>

      <aside
        aria-hidden
        className="relative hidden overflow-hidden bg-black lg:block lg:[border-start-start-radius:9%_100%]"
      >
        <CountrySlides />
      </aside>
    </div>
  );
}
