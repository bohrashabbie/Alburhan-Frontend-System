"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useCallback, useState } from "react";
import useSWR, { useSWRConfig } from "swr";

import { ApiError, fetcher } from "@/lib/api";
import type { Me } from "@/lib/types";

export function useResource<T>(path: string | null) {
  return useSWR<T, ApiError>(path, fetcher, { revalidateOnFocus: false });
}

export function useMe() {
  return useSWR<Me, ApiError>("/me", fetcher, {
    shouldRetryOnError: false,
    revalidateOnFocus: false,
  });
}

/** Drops everything cached for the old session or company, then navigates. */
export function useFreshStart() {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  return useCallback(
    async (path: string) => {
      await mutate(() => true, undefined, { revalidate: true });
      router.replace(path);
    },
    [mutate, router],
  );
}

/** Tracks pending state and the last error for a form or action. */
export function useAction() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const run = useCallback(async (action: () => Promise<unknown>) => {
    setPending(true);
    setError(null);
    try {
      await action();
      return true;
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught
          : new ApiError(0, "unknown_error", "Something went wrong. Try again."),
      );
      return false;
    } finally {
      setPending(false);
    }
  }, []);

  const clear = useCallback(() => setError(null), []);

  return { pending, error, run, clear, field: (name: string) => error?.fields[name] };
}

export function onSubmit(handler: () => void) {
  return (event: FormEvent) => {
    event.preventDefault();
    handler();
  };
}
