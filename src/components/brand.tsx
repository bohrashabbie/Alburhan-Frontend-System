/** The product name. It takes its colour from the surrounding text. */
export function Brand({ large = false }: { large?: boolean }) {
  return (
    <span
      className={
        large
          ? "text-[26px] leading-none font-bold tracking-tight"
          : "text-lg font-semibold tracking-tight"
      }
    >
      Al-Burhan
    </span>
  );
}
