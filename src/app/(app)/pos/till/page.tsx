"use client";

import { Maximize2 } from "lucide-react";

import { TillScreen } from "@/components/pos-till";
import { ButtonLink } from "@/components/ui";
import { useWorkspace } from "@/lib/workspace";

export default function TillPage() {
  const { t } = useWorkspace();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <ButtonLink href="/till" variant="ghost" className="h-9" target="_blank">
          <Maximize2 aria-hidden className="size-4" />
          {t("Open full-screen till")}
        </ButtonLink>
      </div>
      <TillScreen />
    </div>
  );
}
