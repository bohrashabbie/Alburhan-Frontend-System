"use client";

import { ActiveBadge, ResourcePage } from "@/components/resource-page";
import { Loading } from "@/components/ui";
import { formatDate, formatMoney } from "@/lib/format";
import { useResource } from "@/lib/hooks";
import { BalanceCards } from "@/lib/hr";
import type { Department, Employee, LeaveBalance, Page, User } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

function Balances({ employee }: { employee: Employee }) {
  const { t } = useWorkspace();
  const data = useResource<{ balances: LeaveBalance[] }>(`/hr/employees/${employee.id}/balance`);
  return (
    <section className="border-t border-line pt-6">
      <h3 className="mb-3 text-base font-bold">{t("Leave this year")}</h3>
      {data.data ? <BalanceCards balances={data.data.balances} /> : <Loading />}
    </section>
  );
}

export default function EmployeesPage() {
  const { company, branches, can, locale, name, t } = useWorkspace();
  const departments = useResource<Page<Department>>(`/hr/departments?company=${company.id}&page_size=200`);
  const people = useResource<Page<Employee>>(`/hr/employees?company=${company.id}&is_active=true&page_size=500`);
  const logins = useResource<Page<User>>(can("users.user.view") ? `/users?default_company=${company.id}&page_size=500` : null);
  const money = (value: string) => formatMoney(value, company.currency, locale);
  const pick = <T,>(items: T[] | undefined, label: (item: T) => string, id: (item: T) => number): [string, string][] => (items ?? []).map((item) => [String(id(item)), label(item)]);

  return (
    <ResourcePage<Employee>
      title="Employees"
      description="Everyone on the payroll, who they report to (their manager approves their leave) and what they are paid."
      endpoint="/hr/employees"
      permission="hr.employee"
      noun="employee"
      wide
      query={{ company: company.id }}
      columns={[
        { label: "Name", render: (row) => <span><span className="block font-medium">{row.full_name}</span><span className="block text-xs text-ink-soft">{row.number} · {row.job_title || "—"}</span></span> },
        { label: "Department", render: (row) => row.department_name ?? "—" },
        { label: "Manager", render: (row) => row.manager_name ?? <span className="text-ink-faint">{t("HR decides")}</span> },
        { label: "Store", render: (row) => row.branch_name ?? "—" },
        { label: "Monthly pay", render: (row) => <span className="tabular-nums">{money(row.monthly_pay)}</span> },
        { label: "Since", render: (row) => <span className="tabular-nums">{formatDate(row.hire_date, locale)}</span> },
        { label: "Status", render: (row) => <ActiveBadge active={row.is_active} /> },
      ]}
      fields={[
        { name: "first_name", label: "First name", required: true },
        { name: "last_name", label: "Last name" },
        { name: "name_ar", label: "Name (Arabic)" },
        { name: "job_title", label: "Job title" },
        { name: "email", label: "Email", type: "email", hint: "Leave emails go here. Needed for managers: the approval link is emailed." },
        { name: "phone", label: "Phone" },
        { name: "department", label: "Department", type: "select", nullable: true, options: pick(departments.data?.results, (item) => name(item), (item) => item.id), section: "Work" },
        { name: "manager", label: "Manager", type: "select", nullable: true, hint: "Approves this person's leave. Empty: HR decides.", options: (values) => pick(people.data?.results.filter((item) => String(item.id) !== String(values.__id ?? "")), (item) => `${item.full_name}${item.job_title ? ` · ${item.job_title}` : ""}`, (item) => item.id) },
        { name: "branch", label: "Store", type: "select", nullable: true, options: branches.map((item): [string, string] => [String(item.id), name(item)]) },
        { name: "user", label: "Login", type: "select", nullable: true, hint: "Their ERP login, so they can ask for leave and approve their team's.", options: pick(logins.data?.results, (item) => `${[item.first_name, item.last_name].filter(Boolean).join(" ") || item.username} · ${item.email}`, (item) => item.id) },
        { name: "hire_date", label: "Hire date", type: "date", required: true },
        { name: "end_date", label: "Last day", type: "date", nullable: true, hint: "Set when they leave the company." },
        { name: "civil_id", label: "Civil ID", section: "Personal" },
        { name: "nationality", label: "Nationality", type: "country" },
        { name: "iban", label: "IBAN", hint: "Salary is paid here." },
        { name: "basic_salary", label: `Basic salary (${company.currency})`, type: "number", section: "Monthly pay" },
        { name: "housing_allowance", label: `Housing allowance (${company.currency})`, type: "number" },
        { name: "transport_allowance", label: `Transport allowance (${company.currency})`, type: "number" },
        { name: "other_allowance", label: `Other allowance (${company.currency})`, type: "number" },
        { name: "annual_leave_days", label: "Annual leave days", type: "number", hint: "Paid days off per year." },
        { name: "is_active", label: "Active", type: "checkbox" },
      ]}
      initial={(row) => ({
        __id: row ? String(row.id) : "",
        first_name: row?.first_name ?? "",
        last_name: row?.last_name ?? "",
        name_ar: row?.name_ar ?? "",
        job_title: row?.job_title ?? "",
        email: row?.email ?? "",
        phone: row?.phone ?? "",
        department: row?.department ? String(row.department) : "",
        manager: row?.manager ? String(row.manager) : "",
        branch: row?.branch ? String(row.branch) : "",
        user: row?.user ? String(row.user) : "",
        hire_date: row?.hire_date ?? new Date().toISOString().slice(0, 10),
        end_date: row?.end_date ?? "",
        civil_id: row?.civil_id ?? "",
        nationality: row?.nationality ?? "",
        iban: row?.iban ?? "",
        basic_salary: row ? String(Number(row.basic_salary)) : "0",
        housing_allowance: row ? String(Number(row.housing_allowance)) : "0",
        transport_allowance: row ? String(Number(row.transport_allowance)) : "0",
        other_allowance: row ? String(Number(row.other_allowance)) : "0",
        annual_leave_days: row ? String(Number(row.annual_leave_days)) : "30",
        is_active: row?.is_active ?? true,
      })}
      toPayload={() => ({ company: company.id, __id: undefined })}
      drawerExtra={(row) => <Balances employee={row} />}
    />
  );
}
