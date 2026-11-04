import type { ReactNode } from "react";

import { Brand } from "@/components/brand";

export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div>
      <div className="mb-8 lg:hidden">
        <Brand />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {description ? <p className="mt-1.5 text-sm text-ink-soft">{description}</p> : null}
      <div className="mt-6">{children}</div>
      {footer ? <div className="mt-6 text-sm text-ink-soft">{footer}</div> : null}
    </div>
  );
}
