"use client";

import { createContext, type ReactNode, useContext } from "react";

import { LOCALE_COOKIE, type Locale, translate } from "@/lib/i18n";

/** The language chosen by cookie, read on the server so the first render is already right. */
const LocaleContext = createContext<Locale>("en");

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}

/** Remembers the language for a year. Call router.refresh() afterwards to re-render. */
export function saveLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
}

export function useT() {
  const locale = useLocale();
  return (text: string) => translate(locale, text);
}
