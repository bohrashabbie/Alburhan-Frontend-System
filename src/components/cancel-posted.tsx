"use client";

import { useSWRConfig } from "swr";

import { Button } from "@/components/ui";
import { api } from "@/lib/api";
import { useAction } from "@/lib/hooks";
import { useWorkspace } from "@/lib/workspace";

/**
 * Cancels a document that was booked in the accounts as it was saved (an expense, a money
 * transfer): its entry is reversed today and the row stays, marked cancelled.
 */
export function CancelPosted({ endpoint, id, label }: { endpoint: string; id: number; label: string }) {
  const { t } = useWorkspace();
  const { mutate } = useSWRConfig();
  const action = useAction();
  const cancel = async () => {
    if (!window.confirm(`${t("Cancel")} ${label}? ${t("Its entry in the accounts is reversed.")}`)) return;
    const done = await action.run(() => api.post(`${endpoint}/${id}/cancel/`, { date: new Date().toLocaleDateString("en-CA") }));
    if (done) await mutate((key) => typeof key === "string" && key.startsWith("/accounting/"));
    else window.alert(action.error?.message ?? t("Something went wrong. Try again."));
  };
  return (
    <Button
      variant="danger"
      pending={action.pending}
      className="!h-8 !px-3 !text-xs"
      onClick={(event) => {
        event.stopPropagation();
        void cancel();
      }}
    >
      {t("Cancel")}
    </Button>
  );
}
