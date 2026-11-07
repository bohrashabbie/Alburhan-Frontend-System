"use client";

import { type InputHTMLAttributes, useEffect, useRef } from "react";

import { ActiveBadge, ResourcePage, type Values } from "@/components/resource-page";
import { Badge, Loading } from "@/components/ui";
import { useResource } from "@/lib/hooks";
import type { Permission, Role } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

const MODULE_NAMES: Record<string, string> = {
  access: "Access",
  accounting: "Accounts",
  catalog: "Catalog",
  hr: "HR",
  installation: "Installation",
  inventory: "Inventory",
  organization: "Organization",
  partners: "Customers & suppliers",
  pos: "POS",
  projects: "Projects",
  purchasing: "Purchasing",
  reports: "Reports",
  sales: "Sales",
  users: "Users",
};

/** The standard columns. Any other action (e.g. "approve") shows as an extra tick in its row. */
const VERBS = [
  ["view", "View"],
  ["create", "Create"],
  ["update", "Edit"],
  ["delete", "Delete"],
] as const;

type Row = {
  key: string; // module.resource
  label: string; // "Exchange rates"
  byVerb: Map<string, Permission>;
};

/** "View exchange rates" → "Exchange rates". */
function resourceLabel(permission: Permission) {
  const rest = permission.name.split(" ").slice(1).join(" ");
  return rest ? rest[0].toUpperCase() + rest.slice(1) : permission.code;
}

function buildRows(permissions: Permission[]) {
  const modules = new Map<string, Map<string, Row>>();
  for (const permission of permissions) {
    const [module, resource, ...verb] = permission.code.split(".");
    const key = `${module}.${resource}`;
    const rows = modules.get(module) ?? new Map<string, Row>();
    const row = rows.get(key) ?? { key, label: "", byVerb: new Map() };
    row.byVerb.set(verb.join("."), permission);
    if (!row.label || verb.join(".") === "view") row.label = resourceLabel(permission);
    rows.set(key, row);
    modules.set(module, rows);
  }
  return [...modules.entries()].map(([module, rows]) => ({
    module,
    rows: [...rows.values()].sort((a, b) => a.label.localeCompare(b.label)),
  }));
}

/** A checkbox that can show "some selected" (a dash) as well as on and off. */
function Tick({
  checked,
  partial = false,
  label,
  ...props
}: { checked: boolean; partial?: boolean; label: string } & InputHTMLAttributes<HTMLInputElement>) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = partial && !checked;
  }, [partial, checked]);
  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label={label}
      title={label}
      checked={checked}
      className="size-4 cursor-pointer accent-[var(--accent)] disabled:cursor-not-allowed"
      {...props}
    />
  );
}

function PermissionGrid({
  values,
  set,
  locked,
}: {
  values: Values;
  set: (name: string, value: string | boolean) => void;
  locked: boolean;
}) {
  const { t } = useWorkspace();
  const catalogue = useResource<Permission[]>("/access/permissions");
  const chosen = new Set(String(values.permissions ?? "").split(",").filter(Boolean));
  const modules = buildRows(catalogue.data ?? []);

  const toggle = (codes: string[], on: boolean) => {
    const next = new Set(chosen);
    for (const code of codes) {
      if (on) next.add(code);
      else next.delete(code);
    }
    set("permissions", [...next].sort().join(","));
  };
  const state = (codes: string[]) => {
    const count = codes.filter((code) => chosen.has(code)).length;
    return { all: codes.length > 0 && count === codes.length, some: count > 0 };
  };

  return (
    <fieldset disabled={locked} className="flex min-w-0 flex-col gap-4">
      <legend className="mb-1 flex w-full items-baseline justify-between gap-3">
        <span className="text-base font-bold">{t("Permissions")}</span>
        <span className="text-sm text-ink-soft tabular-nums">
          {chosen.size} / {catalogue.data?.length ?? 0}
        </span>
      </legend>
      {locked ? (
        <p className="rounded-lg bg-surface-muted px-3.5 py-2.5 text-sm text-ink-soft">
          This is a system role. It always has every permission and can&apos;t be changed.
        </p>
      ) : null}

      {!catalogue.data ? <Loading label={t("Loading…")} /> : null}
      {modules.map(({ module, rows }) => {
        const moduleCodes = rows.flatMap((row) => [...row.byVerb.values()].map((p) => p.code));
        const moduleState = state(moduleCodes);
        const moduleName = t(MODULE_NAMES[module] ?? module);
        return (
          <section key={module} className="overflow-hidden rounded-xl border border-line">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col />
                {VERBS.map(([verb]) => (
                  <col key={verb} className="w-[4.5rem]" />
                ))}
              </colgroup>
              <thead className="border-b border-line bg-surface-muted/60">
                <tr>
                  <th scope="col" className="px-4 py-2.5 text-start">
                    <label className="flex items-center gap-2.5 font-semibold">
                      <Tick
                        label={`${moduleName}: all`}
                        checked={moduleState.all}
                        partial={moduleState.some}
                        onChange={(event) => toggle(moduleCodes, event.target.checked)}
                      />
                      <span className="truncate">{moduleName}</span>
                    </label>
                  </th>
                  {VERBS.map(([verb, title]) => (
                    <th
                      key={verb}
                      scope="col"
                      className="px-1 py-2.5 text-center text-xs font-medium tracking-wide text-ink-soft uppercase"
                    >
                      {t(title)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((row) => {
                  const rowCodes = [...row.byVerb.values()].map((p) => p.code);
                  const rowState = state(rowCodes);
                  const extras = [...row.byVerb.entries()].filter(
                    ([verb]) => !VERBS.some(([known]) => known === verb),
                  );
                  return (
                    <tr key={row.key} className="transition-colors hover:bg-surface-muted/50">
                      <th scope="row" className="px-4 py-2.5 text-start font-normal">
                        <label className="flex min-w-0 items-center gap-2.5">
                          <Tick
                            label={`${row.label}: all`}
                            checked={rowState.all}
                            partial={rowState.some}
                            onChange={(event) => toggle(rowCodes, event.target.checked)}
                          />
                          <span className="min-w-0">
                            <span className="block truncate">{row.label}</span>
                            {extras.length > 0 ? (
                              <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                                {extras.map(([verb, permission]) => (
                                  <label
                                    key={verb}
                                    className="flex items-center gap-1.5 text-xs text-ink-soft"
                                  >
                                    <Tick
                                      label={permission.name}
                                      checked={chosen.has(permission.code)}
                                      onChange={(event) =>
                                        toggle([permission.code], event.target.checked)
                                      }
                                    />
                                    {verb}
                                  </label>
                                ))}
                              </span>
                            ) : null}
                          </span>
                        </label>
                      </th>
                      {VERBS.map(([verb]) => {
                        const permission = row.byVerb.get(verb);
                        return (
                          <td key={verb} className="px-1 py-2.5 text-center align-middle">
                            {permission ? (
                              <Tick
                                label={permission.name}
                                checked={chosen.has(permission.code)}
                                onChange={(event) =>
                                  toggle([permission.code], event.target.checked)
                                }
                              />
                            ) : (
                              <span aria-hidden className="text-ink-faint">
                                —
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        );
      })}
    </fieldset>
  );
}

export default function RolesPage() {
  const { name } = useWorkspace();

  return (
    <ResourcePage<Role>
      title="Roles"
      description="A role is a job, such as Salesperson or Accountant. Give it permissions here, then assign it to people under Users."
      endpoint="/access/roles"
      permission="access.role"
      noun="role"
      wide
      columns={[
        { label: "Name", render: (row) => <span className="font-medium">{name(row)}</span> },
        { label: "Code", render: (row) => <span className="font-mono text-xs">{row.code}</span> },
        {
          label: "Permissions",
          render: (row) => <span className="tabular-nums">{row.permissions.length}</span>,
        },
        {
          label: "Status",
          render: (row) => (
            <span className="flex gap-1.5">
              <ActiveBadge active={row.is_active} />
              {row.is_system ? <Badge>System</Badge> : null}
            </span>
          ),
        },
      ]}
      fields={[
        { name: "code", label: "Code", required: true, lockOnEdit: true, hint: "Lowercase, e.g. salesperson." },
        { name: "name", label: "Name", required: true },
        { name: "name_ar", label: "Name (Arabic)" },
        { name: "is_active", label: "Active", type: "checkbox" },
        { name: "description", label: "Description", type: "textarea" },
      ]}
      initial={(row) => ({
        code: row?.code ?? "",
        name: row?.name ?? "",
        name_ar: row?.name_ar ?? "",
        is_active: row?.is_active ?? true,
        description: row?.description ?? "",
        permissions: (row?.permissions ?? []).join(","),
        is_system: row?.is_system ?? false,
      })}
      extraForm={(values, set) => (
        <PermissionGrid values={values} set={set} locked={Boolean(values.is_system)} />
      )}
      toPayload={(values) => ({
        permissions: String(values.permissions ?? "").split(",").filter(Boolean),
      })}
    />
  );
}
