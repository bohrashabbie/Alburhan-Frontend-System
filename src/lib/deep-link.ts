"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useResource } from "@/lib/hooks";

/**
 * `?open=<id>` and `?new=1` on a list page (used by the command palette and cross-page buttons).
 * Call inside a Suspense boundary. `clear()` drops the query once the drawer closes.
 */
export function useDeepLink<T>(endpoint: string, canCreate: boolean) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const id = params.get("open");
  const linked = useResource<T>(id ? `${endpoint}/${id}` : null);
  return {
    linked: id ? (linked.data ?? null) : null,
    wantsNew: params.get("new") === "1" && canCreate,
    clear: () => router.replace(pathname, { scroll: false }),
  };
}
