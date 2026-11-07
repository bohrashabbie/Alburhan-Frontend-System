"use client";

import { Check, Globe2, Store, Trash2 } from "lucide-react";
import { useState } from "react";

import { ActiveBadge, ResourcePage } from "@/components/resource-page";
import { UserAvatar } from "@/components/user-avatar";
import { Badge, Button, ErrorBanner, IconButton, SelectField } from "@/components/ui";
import { api, withQuery } from "@/lib/api";
import { formatDate, fullName } from "@/lib/format";
import { useAction, useResource } from "@/lib/hooks";
import type { Page, Role, User, UserRole } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

const ALL = "all";

/**
 * Where a person works and as what. Access is a hierarchy: a country (company), then either the
 * whole country or chosen stores (branches) in it. A main administrator can grant every country
 * at once.
 */
function Access({ user }: { user: User }) {
  const { me, can, name, t } = useWorkspace();
  const assignments = useResource<Page<UserRole>>(withQuery("/access/user-roles", { user: user.id, page_size: 200 }));
  const roles = useResource<Page<Role>>("/access/roles?is_active=true&page_size=200");
  const countries = me.companies;
  const [role, setRole] = useState("");
  const [country, setCountry] = useState(countries.length === 1 ? String(countries[0].id) : "");
  const [stores, setStores] = useState<number[]>([]);
  const action = useAction();
  const storesOf = (companyId: number) => me.branches.filter((item) => item.company === companyId);
  const everyCountry = country === ALL;
  const chosenCountry = countries.find((item) => String(item.id) === country);

  const toggle = (id: number) => setStores((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  const add = () =>
    action.run(async () => {
      const targets: [number, number | null][] = everyCountry
        ? countries.map((item) => [item.id, null])
        : stores.length
          ? stores.map((id) => [Number(country), id])
          : [[Number(country), null]];
      for (const [company, branch] of targets) {
        await api.post("/access/user-roles", { user: user.id, role: Number(role), company, branch });
      }
      setRole("");
      setStores([]);
      await assignments.mutate();
    });
  const remove = (id: number) =>
    action.run(async () => {
      await api.delete(`/access/user-roles/${id}`);
      await assignments.mutate();
    });

  const rows = assignments.data?.results ?? [];
  const byCountry = new Map<string, UserRole[]>();
  for (const row of rows) byCountry.set(row.company_code, [...(byCountry.get(row.company_code) ?? []), row]);
  const countryName = (code: string) => name(countries.find((item) => item.code === code)) || code;

  return (
    <section className="border-t border-line pt-6">
      <h3 className="text-base font-bold">{t("Access")}</h3>
      <p className="mt-1 text-sm text-ink-soft">{t("Country first, then the whole country or only some stores. Each line gives one role there.")}</p>
      {user.is_superuser ? (
        <p className="mt-3 flex items-center gap-2 rounded-xl border border-line bg-surface-muted/50 px-4 py-3 text-sm">
          <Globe2 aria-hidden className="size-4 text-ink-soft" />
          {t("Main administrator: every country and store, whatever the roles below say.")}
        </p>
      ) : null}
      <ErrorBanner error={action.error ?? assignments.error} />
      <div className="mt-3 flex flex-col gap-3">
        {rows.length === 0 && assignments.data ? <p className="rounded-xl border border-dashed border-line-strong px-4 py-4 text-sm text-ink-soft">{t("No access yet. Add a role below.")}</p> : null}
        {[...byCountry.entries()].map(([code, items]) => (
          <div key={code} className="overflow-hidden rounded-xl border border-line">
            <div className="flex items-center gap-2 border-b border-line bg-surface-muted/50 px-4 py-2 text-sm font-semibold"><Globe2 aria-hidden className="size-4 text-ink-soft" />{countryName(code)}</div>
            <ul className="divide-y divide-line">
              {items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="font-medium">{item.role_name}</span>
                    <span className="text-ink-faint">·</span>
                    <span className="inline-flex items-center gap-1 text-ink-soft">{item.branch_name ? <><Store aria-hidden className="size-3.5" />{item.branch_name}</> : t("Whole country")}</span>
                  </span>
                  {can("access.user_role.delete") ? (
                    <IconButton label={t("Remove access")} onClick={() => remove(item.id)}>
                      <Trash2 aria-hidden className="size-4" />
                    </IconButton>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {can("access.user_role.create") ? (
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-line p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField label={t("Role")} value={role} onChange={(event) => setRole(event.target.value)}>
              <option value="">—</option>
              {roles.data?.results.map((item) => <option key={item.id} value={item.id}>{name(item)}</option>)}
            </SelectField>
            <SelectField label={t("Country")} value={country} onChange={(event) => { setCountry(event.target.value); setStores([]); }}>
              {countries.length > 1 ? <option value="">—</option> : null}
              {me.is_superuser && countries.length > 1 ? <option value={ALL}>{t("All countries")}</option> : null}
              {countries.map((item) => <option key={item.id} value={item.id}>{name(item)}</option>)}
            </SelectField>
          </div>
          {chosenCountry ? (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">{t("Where")}</span>
              <div className="flex flex-wrap gap-2">
                <StoreChip active={stores.length === 0} onClick={() => setStores([])}>{t("Whole country")}</StoreChip>
                {storesOf(chosenCountry.id).map((item) => (
                  <StoreChip key={item.id} active={stores.includes(item.id)} onClick={() => toggle(item.id)}>{name(item)}</StoreChip>
                ))}
              </div>
              <p className="text-xs text-ink-faint">{t("Pick one or more stores to limit the role to them.")}</p>
            </div>
          ) : null}
          <div className="flex justify-end">
            <Button variant="secondary" disabled={!role || !country} pending={action.pending} onClick={add}>
              {t("Add access")}
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function StoreChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors ${active ? "border-accent bg-accent text-white" : "border-line-strong bg-surface text-ink hover:bg-surface-muted"}`}
    >
      {active ? <Check aria-hidden className="size-3.5" /> : null}
      {children}
    </button>
  );
}

function AccessSummary({ user }: { user: User }) {
  const { t } = useWorkspace();
  if (user.is_superuser) return <Badge tone="success">{t("Main administrator")}</Badge>;
  const places = [...new Set((user.access ?? []).map((item) => (item.branch_name ? `${item.company_code} · ${item.branch_name}` : `${item.company_code} · ${t("Whole country")}`)))];
  if (places.length === 0) return <span className="text-ink-faint">{t("No access")}</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {places.slice(0, 3).map((place) => <Badge key={place}>{place}</Badge>)}
      {places.length > 3 ? <Badge>+{places.length - 3}</Badge> : null}
    </span>
  );
}

export default function UsersPage() {
  const { me, company, companies, locale, name } = useWorkspace();
  const storeOptions = (values: Record<string, string | boolean>): [string, string][] =>
    me.branches.filter((item) => String(item.company) === String(values.default_company)).map((item) => [String(item.id), name(item)]);

  return (
    <ResourcePage<User>
      title="Users"
      description="People who sign in. Each belongs to a country; what they can do, and in which stores, comes from their access."
      endpoint="/users"
      permission="users.user"
      noun="user"
      wide
      columns={[
        { label: "Name", render: (row) => <span className="flex items-center gap-3"><UserAvatar url={row.avatar_url} name={fullName(row)} size="size-9" text="text-xs" ring={false} /><span className="font-medium">{fullName(row)}</span></span> },
        { label: "Email", render: (row) => row.email },
        { label: "Access", render: (row) => <AccessSummary user={row} /> },
        {
          label: "Last sign-in",
          render: (row) => <span className="tabular-nums">{formatDate(row.last_login, locale)}</span>,
        },
        { label: "Status", render: (row) => <ActiveBadge active={row.is_active} /> },
      ]}
      fields={[
        { name: "first_name", label: "First name" },
        { name: "last_name", label: "Last name" },
        { name: "email", label: "Email", type: "email", required: true },
        { name: "username", label: "Username", required: true, lockOnEdit: true },
        { name: "phone", label: "Phone" },
        {
          name: "preferred_language",
          label: "Language",
          type: "select",
          required: true,
          options: [
            ["en", "English"],
            ["ar", "العربية"],
          ],
        },
        {
          name: "default_company",
          label: "Country",
          type: "select",
          required: true,
          hint: "The country this person belongs to. Its administrators manage the account.",
          options: companies.map((item) => [String(item.id), name(item)]),
        },
        {
          name: "default_branch",
          label: "Home store",
          type: "select",
          nullable: true,
          hint: "Where they usually work; opens first when they sign in.",
          options: storeOptions,
        },
        {
          name: "password",
          label: "Password",
          type: "text",
          hint: "At least 8 characters. Leave empty to keep the current one.",
        },
        { name: "is_active", label: "Active", type: "checkbox" },
        ...(me.is_superuser
          ? [{ name: "is_superuser", label: "Main administrator", type: "checkbox" as const, hint: "Full access to every country and store, including creating countries, stores and other administrators." }]
          : []),
      ]}
      initial={(row) => ({
        first_name: row?.first_name ?? "",
        last_name: row?.last_name ?? "",
        email: row?.email ?? "",
        username: row?.username ?? "",
        phone: row?.phone ?? "",
        preferred_language: row?.preferred_language ?? "en",
        default_company: String(row?.default_company ?? company.id),
        default_branch: row?.default_branch ? String(row.default_branch) : "",
        password: "",
        is_active: row?.is_active ?? true,
        ...(me.is_superuser ? { is_superuser: row?.is_superuser ?? false } : {}),
      })}
      toPayload={(values) => (values.password ? {} : { password: undefined })}
      drawerExtra={(row) => <Access user={row} />}
    />
  );
}
