"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";

import { ActiveBadge, ResourcePage } from "@/components/resource-page";
import { Button, ErrorBanner, IconButton, SelectField } from "@/components/ui";
import { api, withQuery } from "@/lib/api";
import { formatDate, fullName } from "@/lib/format";
import { useAction, useResource } from "@/lib/hooks";
import type { Page, Role, User, UserRole } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

/** The roles a user holds in the current company, and a form to add one. */
function RoleAssignments({ user }: { user: User }) {
  const { company, branches, can, name, t } = useWorkspace();
  const path = withQuery("/access/user-roles", { user: user.id, company: company.id });
  const assignments = useResource<Page<UserRole>>(path);
  const roles = useResource<Page<Role>>("/access/roles?is_active=true");
  const [role, setRole] = useState("");
  const [branch, setBranch] = useState("");
  const action = useAction();

  const add = () =>
    action.run(async () => {
      await api.post("/access/user-roles", {
        user: user.id,
        role: Number(role),
        company: company.id,
        branch: branch ? Number(branch) : null,
      });
      setRole("");
      setBranch("");
      await assignments.mutate();
    });

  const remove = (id: number) =>
    action.run(async () => {
      await api.delete(`/access/user-roles/${id}`);
      await assignments.mutate();
    });

  return (
    <section className="border-t border-line pt-6">
      <h3 className="text-base font-bold">{t("Role assignments")}</h3>
      <p className="mt-1 text-sm text-ink-soft">
        In {name(company)}. A role without a branch applies to every branch.
      </p>
      <ErrorBanner error={action.error ?? assignments.error} />
      <ul className="mt-3 divide-y divide-line rounded-xl border border-line">
        {(assignments.data?.results ?? []).length === 0 ? (
          <li className="px-4 py-3 text-sm text-ink-soft">No roles in this company yet.</li>
        ) : null}
        {assignments.data?.results.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <span>
              <span className="font-medium">{item.role_name}</span>
              <span className="text-ink-soft"> · {item.branch_name ?? t("All branches")}</span>
            </span>
            {can("access.user_role.delete") ? (
              <IconButton label={t("Delete")} onClick={() => remove(item.id)}>
                <Trash2 aria-hidden className="size-4" />
              </IconButton>
            ) : null}
          </li>
        ))}
      </ul>
      {can("access.user_role.create") ? (
        <div className="mt-4 grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <SelectField label={t("Role")} value={role} onChange={(event) => setRole(event.target.value)}>
            <option value="">—</option>
            {roles.data?.results.map((item) => (
              <option key={item.id} value={item.id}>
                {name(item)}
              </option>
            ))}
          </SelectField>
          <SelectField
            label={t("Branch")}
            value={branch}
            onChange={(event) => setBranch(event.target.value)}
          >
            <option value="">{t("All branches")}</option>
            {branches.map((item) => (
              <option key={item.id} value={item.id}>
                {name(item)}
              </option>
            ))}
          </SelectField>
          <Button variant="secondary" disabled={!role} pending={action.pending} onClick={add}>
            {t("Add")}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

export default function UsersPage() {
  const { company, companies, branches, locale, name } = useWorkspace();

  return (
    <ResourcePage<User>
      title="Users"
      description="People who sign in. What they can do comes from their role assignments."
      endpoint="/users"
      permission="users.user"
      noun="user"
      wide
      columns={[
        { label: "Name", render: (row) => <span className="font-medium">{fullName(row)}</span> },
        { label: "Email", render: (row) => row.email },
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
          label: "Home company",
          type: "select",
          required: true,
          options: companies.map((item) => [String(item.id), name(item)]),
        },
        {
          name: "default_branch",
          label: "Home branch",
          type: "select",
          nullable: true,
          options: branches.map((item) => [String(item.id), name(item)]),
        },
        {
          name: "password",
          label: "Password",
          type: "text",
          hint: "At least 8 characters. Leave empty to keep the current one.",
        },
        { name: "is_active", label: "Active", type: "checkbox" },
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
      })}
      toPayload={(values) => (values.password ? {} : { password: undefined })}
      drawerExtra={(row) => <RoleAssignments user={row} />}
    />
  );
}
