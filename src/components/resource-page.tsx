"use client";

import { Plus } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Fragment, type ReactNode, Suspense, useState } from "react";
import { useSWRConfig } from "swr";

import {
  Badge,
  Button,
  CheckboxField,
  Drawer,
  EmptyState,
  ErrorBanner,
  Loading,
  PageHeader,
  SearchField,
  SelectField,
  Table,
  TextAreaField,
  TextField,
} from "@/components/ui";
import { CountryPicker } from "@/components/country";
import { api, withQuery } from "@/lib/api";
import { onSubmit, useAction, useResource } from "@/lib/hooks";
import type { Page } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

export type Values = Record<string, string | boolean>;

export type Field = {
  name: string;
  label: string;
  type?:
    | "text"
    | "email"
    | "url"
    | "date"
    | "number"
    | "textarea"
    | "select"
    | "checkbox"
    | "country"
    | "custom";
  /** For type "custom": render your own control. */
  render?: (props: {
    value: string | boolean | undefined;
    onChange: (value: string | boolean) => void;
    error?: string;
    disabled: boolean;
    label: string;
  }) => ReactNode;
  /** Fixed choices, or choices that depend on other values in the form (e.g. stores of the chosen country). */
  options?: [string, string][] | ((values: Values) => [string, string][]);
  required?: boolean;
  hint?: string;
  /** Sent as null when empty (nullable foreign keys and dates). */
  nullable?: boolean;
  /** Can be set when creating but not changed afterwards (e.g. codes used in document numbers). */
  lockOnEdit?: boolean;
  /** Spans both columns of the form grid. */
  wide?: boolean;
  /** Starts a new titled group in the form, e.g. "Lighting specification". */
  section?: string;
};

/** A dropdown beside the search box that narrows the list, e.g. by category. */
export type Filter = { name: string; label: string; options: [string, string][] };

export type Column<T> = { label: string; render: (row: T) => ReactNode };

type ResourcePageProps<T> = Parameters<typeof ResourcePageInner<T & { id: number }>>[0];

/**
 * A list page with search, paging and a slide-in drawer to create, edit and delete rows.
 * Buttons show only when the user holds `<permission>.create|update|delete` in the current company.
 * Deep links: `?open=<id>` opens that row, `?new=1` opens a blank form.
 */
export function ResourcePage<T extends { id: number }>(props: ResourcePageProps<T>) {
  return (
    <Suspense fallback={<Loading />}>
      <ResourcePageInner<T> {...props} />
    </Suspense>
  );
}

function ResourcePageInner<T extends { id: number }>({
  title,
  description,
  endpoint,
  permission,
  query = {},
  columns,
  fields,
  initial,
  noun,
  extraForm,
  drawerExtra,
  toPayload,
  wide = false,
  filters = [],
  headerActions,
  emptyAction,
}: {
  filters?: Filter[];
  /** Extra buttons beside Add, e.g. "Create periods for 2026". */
  headerActions?: ReactNode;
  /** Shown in the empty state, e.g. "Set up accounting". */
  emptyAction?: ReactNode;
  /** A wider form panel, for forms with tables such as the role permission grid. */
  wide?: boolean;
  title: string;
  description?: string;
  /** API path, e.g. "/organization/branches". */
  endpoint: string;
  /** Permission prefix, e.g. "organization.branch". */
  permission: string;
  /** Extra list filters, e.g. { company: 1 }. */
  query?: Record<string, string | number | null | undefined>;
  columns: Column<T>[];
  fields: Field[];
  /** Form values for a new row (row undefined) or an existing one. */
  initial: (row?: T) => Values;
  /** Singular name for buttons and titles, e.g. "branch". */
  noun: string;
  /** Extra form controls under the standard fields (e.g. the permission picker). */
  extraForm?: (
    values: Values,
    set: (name: string, value: string | boolean) => void,
    fieldError: (name: string) => string | undefined,
  ) => ReactNode;
  /** Shown under the form when editing an existing row (e.g. a user's role assignments). */
  drawerExtra?: (row: T) => ReactNode;
  toPayload?: (values: Values) => Record<string, unknown>;
}) {
  const { can, t } = useWorkspace();
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<T | "new" | null>(null);

  const listPath = withQuery(endpoint, {
    ...query,
    ...filterValues,
    search: search.trim(),
    page,
  });
  const list = useResource<Page<T>>(listPath);
  const { mutate } = useSWRConfig();
  // Refresh every cached view of this endpoint (the list, and e.g. a manager dropdown built from it).
  const refreshAll = () => mutate((key) => typeof key === "string" && key.startsWith(endpoint));

  const canCreate = can(`${permission}.create`);
  const canUpdate = can(`${permission}.update`);
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const linkedId = params.get("open");
  const wantsNew = params.get("new") === "1" && canCreate;
  const linked = useResource<T>(linkedId && canUpdate ? `${endpoint}/${linkedId}` : null);
  const linkedRow = linkedId && linked.data ? linked.data : null;
  const rows = list.data?.results ?? [];
  const pages = list.data ? Math.max(1, Math.ceil(list.data.count / 50)) : 1;

  return (
    <>
      <PageHeader
        title={t(title)}
        description={description ? t(description) : undefined}
        actions={
          headerActions || canCreate ? (
            <>
              {headerActions}
              {canCreate ? (
                <Button onClick={() => setEditing("new")}>
                  <Plus aria-hidden className="size-5" />
                  {t("Add")}
                </Button>
              ) : null}
            </>
          ) : null
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SearchField
          label={t("Search")}
          placeholder={t("Search…")}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
        {filters.map((filter) => (
          <SelectField
            key={filter.name}
            label={t(filter.label)}
            value={filterValues[filter.name] ?? ""}
            onChange={(event) => {
              setFilterValues({ ...filterValues, [filter.name]: event.target.value });
              setPage(1);
            }}
          >
            <option value="">{t("All")}</option>
            {filter.options.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectField>
        ))}
      </div>
      <ErrorBanner error={list.error} />
      {!list.data ? (
        list.error ? null : (
          <Loading label={t("Loading…")} />
        )
      ) : rows.length === 0 ? (
        <EmptyState
          title={search || Object.values(filterValues).some(Boolean) ? t("No matches") : t("Nothing here yet")}
          description={search || Object.values(filterValues).some(Boolean) ? t("Nothing matches these filters. Clear them to see everything.") : `No ${noun}s have been added.`}
          action={
            search || Object.values(filterValues).some(Boolean) ? (
              <Button variant="secondary" onClick={() => { setSearch(""); setFilterValues({}); setPage(1); }}>{t("Clear filters")}</Button>
            ) : (
              emptyAction ?? (canCreate ? <Button onClick={() => setEditing("new")}><Plus aria-hidden className="size-5" />{t("Add")} {t(noun)}</Button> : undefined)
            )
          }
        />
      ) : (
        <>
          <Table head={columns.map((column) => t(column.label))}>
            {rows.map((row) => (
              <tr
                key={row.id}
                onClick={canUpdate ? () => setEditing(row) : undefined}
                className={canUpdate ? "cursor-pointer" : undefined}
              >
                {columns.map((column) => (
                  <td key={column.label} className="px-4 py-3 align-middle">
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </Table>
          {pages > 1 ? (
            <div className="mt-4 flex items-center justify-end gap-2 text-sm text-ink-soft">
              <Button variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                ‹
              </Button>
              <span className="tabular-nums">
                {page} / {pages}
              </span>
              <Button
                variant="secondary"
                disabled={page >= pages}
                onClick={() => setPage(page + 1)}
              >
                ›
              </Button>
            </div>
          ) : null}
        </>
      )}

      {!editing && (wantsNew || linkedRow) ? (
        <EditDrawer
          key={wantsNew ? "link-new" : `link-${linkedRow!.id}`}
          row={wantsNew ? undefined : linkedRow!}
          endpoint={endpoint}
          permission={permission}
          noun={noun}
          fields={fields}
          initial={initial}
          extraForm={extraForm}
          drawerExtra={drawerExtra}
          toPayload={toPayload}
          wide={wide}
          onClose={() => router.replace(pathname, { scroll: false })}
          onSaved={refreshAll}
        />
      ) : null}
      {editing ? (
        <EditDrawer
          key={editing === "new" ? "new" : editing.id}
          row={editing === "new" ? undefined : editing}
          endpoint={endpoint}
          permission={permission}
          noun={noun}
          fields={fields}
          initial={initial}
          extraForm={extraForm}
          drawerExtra={drawerExtra}
          toPayload={toPayload}
          wide={wide}
          onClose={() => setEditing(null)}
          onSaved={refreshAll}
          onCreated={drawerExtra ? (created) => setEditing(created) : undefined}
        />
      ) : null}
    </>
  );
}

function defaultPayload(fields: Field[], values: Values) {
  const payload: Record<string, unknown> = {};
  for (const field of fields) {
    const value = values[field.name];
    payload[field.name] = field.nullable && value === "" ? null : value;
  }
  return payload;
}

function EditDrawer<T extends { id: number }>({
  row,
  endpoint,
  permission,
  noun,
  fields,
  initial,
  extraForm,
  drawerExtra,
  toPayload,
  wide,
  onClose,
  onSaved,
  onCreated,
}: {
  wide: boolean;
  row?: T;
  endpoint: string;
  permission: string;
  noun: string;
  fields: Field[];
  initial: (row?: T) => Values;
  extraForm?: (
    values: Values,
    set: (name: string, value: string | boolean) => void,
    fieldError: (name: string) => string | undefined,
  ) => ReactNode;
  drawerExtra?: (row: T) => ReactNode;
  toPayload?: (values: Values) => Record<string, unknown>;
  onClose: () => void;
  onSaved: () => void;
  /** When set, a newly created row stays open (e.g. so a new user can be given roles at once). */
  onCreated?: (row: T) => void;
}) {
  const { can, t } = useWorkspace();
  const [values, setValues] = useState<Values>(() => initial(row));
  const save = useAction();
  const remove = useAction();
  const set = (name: string, value: string | boolean) =>
    setValues((current) => ({ ...current, [name]: value }));

  const submit = () =>
    save.run(async () => {
      const payload = { ...defaultPayload(fields, values), ...toPayload?.(values) };
      if (row) await api.patch(`${endpoint}/${row.id}`, payload);
      else {
        const created = await api.post<T>(endpoint, payload);
        if (onCreated) {
          onSaved();
          onCreated(created);
          return;
        }
      }
      onSaved();
      onClose();
    });

  const destroy = () =>
    remove.run(async () => {
      if (!row || !window.confirm(`Delete this ${noun}? This cannot be undone.`)) return;
      await api.delete(`${endpoint}/${row.id}`);
      onSaved();
      onClose();
    });

  const formId = `form-${noun.replace(/\s+/g, "-")}`;

  return (
    <Drawer
      open
      large
      wide={wide}
      onClose={onClose}
      title={row ? `${t("Edit")} ${noun}` : `${t("Add")} ${noun}`}
      footer={
        <div className="flex items-center gap-2">
          {row && can(`${permission}.delete`) ? (
            <Button variant="danger" pending={remove.pending} onClick={destroy}>
              {t("Delete")}
            </Button>
          ) : null}
          <span className="flex-1" />
          <Button variant="secondary" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button type="submit" form={formId} pending={save.pending}>
            {t("Save")}
          </Button>
        </div>
      }
    >
      <form id={formId} onSubmit={onSubmit(submit)} className="profile-section flex flex-col gap-4 pb-6">
        <ErrorBanner error={save.error ?? remove.error} hideFields />
        <div className={`grid gap-x-4 gap-y-5 ${wide ? "sm:grid-cols-2" : ""}`}>
          {fields.map((field, index) => (
            <Fragment key={field.name}>
              {field.section ? (
                <h3
                  className={`text-base font-bold ${wide ? "sm:col-span-2" : ""} ${
                    index > 0 ? "mt-2 border-t border-line pt-5" : ""
                  }`}
                >
                  {t(field.section)}
                </h3>
              ) : null}
              {/* Spanning both columns only applies in two-column (wide) forms; in a single column
                  it would make the grid invent an uneven second column. */}
              <div
                className={
                  wide && (field.wide || field.type === "textarea" || field.type === "checkbox")
                    ? "sm:col-span-2"
                    : ""
                }
              >
                <FieldInput
                  field={typeof field.options === "function" ? { ...field, options: field.options(values) } : field}
                  value={values[field.name]}
                  error={save.field(field.name)}
                  disabled={Boolean(row && field.lockOnEdit)}
                  onChange={(value) => set(field.name, value)}
                />
              </div>
            </Fragment>
          ))}
        </div>
        {extraForm?.(values, set, save.field)}
      </form>
      {row && drawerExtra ? <div className="profile-section pb-6">{drawerExtra(row)}</div> : null}
    </Drawer>
  );
}

function FieldInput({
  field,
  value,
  error,
  disabled,
  onChange,
}: {
  field: Field;
  value: string | boolean | undefined;
  error?: string;
  disabled: boolean;
  onChange: (value: string | boolean) => void;
}) {
  const { t } = useWorkspace();
  const label = t(field.label);

  if (field.type === "custom" && field.render) {
    return <>{field.render({ value, onChange, error, disabled, label })}</>;
  }
  if (field.type === "country") {
    return (
      <CountryPicker
        label={label}
        hint={field.hint}
        error={error}
        required={field.required}
        disabled={disabled}
        value={String(value ?? "")}
        onChange={onChange}
      />
    );
  }
  if (field.type === "checkbox") {
    return (
      <CheckboxField
        label={label}
        hint={field.hint}
        checked={Boolean(value)}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
    );
  }
  if (field.type === "select") {
    return (
      <SelectField
        label={label}
        hint={field.hint}
        error={error}
        required={field.required}
        disabled={disabled}
        value={String(value ?? "")}
        onChange={(event) => onChange(event.target.value)}
      >
        {field.nullable || !field.required ? <option value="">—</option> : null}
        {(Array.isArray(field.options) ? field.options : []).map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </SelectField>
    );
  }
  if (field.type === "textarea") {
    return (
      <TextAreaField
        label={label}
        hint={field.hint}
        error={error}
        disabled={disabled}
        value={String(value ?? "")}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }
  return (
    <TextField
      label={label}
      hint={field.hint}
      error={error}
      type={field.type ?? "text"}
      required={field.required}
      disabled={disabled}
      step={field.type === "number" ? "any" : undefined}
      value={String(value ?? "")}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export function ActiveBadge({ active }: { active: boolean }) {
  const { t } = useWorkspace();
  return active ? <Badge tone="success">{t("Active")}</Badge> : <Badge>{t("Inactive")}</Badge>;
}
