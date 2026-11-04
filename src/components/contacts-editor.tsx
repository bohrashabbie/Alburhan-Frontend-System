"use client";

import { Plus, Star, Trash2 } from "lucide-react";

import { Button, IconButton } from "@/components/ui";
import type { Contact } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

const EMPTY: Contact = { name: "", job_title: "", phone: "", email: "", is_primary: false };

export function parseContacts(value: unknown): Contact[] {
  try {
    return JSON.parse(String(value || "[]"));
  } catch {
    return [];
  }
}

/** Contacts as the API expects them on save (without ids; the list replaces the old one). */
export function contactsPayload(value: unknown) {
  return parseContacts(value).map((contact) => ({
    name: contact.name,
    job_title: contact.job_title,
    phone: contact.phone,
    email: contact.email,
    is_primary: contact.is_primary,
  }));
}

const CELL =
  "w-full min-w-0 rounded-lg border border-line-strong bg-surface px-2.5 py-1.5 text-sm placeholder:text-ink-faint";

/** People at a customer or supplier, edited in place and saved with the record. */
export function ContactsEditor({
  value,
  onChange,
  error,
}: {
  value: unknown;
  onChange: (json: string) => void;
  error?: string;
}) {
  const { t } = useWorkspace();
  const contacts = parseContacts(value);
  const save = (next: Contact[]) => onChange(JSON.stringify(next));
  const update = (index: number, patch: Partial<Contact>) =>
    save(contacts.map((contact, i) => (i === index ? { ...contact, ...patch } : contact)));
  const makePrimary = (index: number) =>
    save(contacts.map((contact, i) => ({ ...contact, is_primary: i === index && !contact.is_primary })));

  return (
    <section className="flex flex-col gap-3 border-t border-line pt-5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold">{t("Contacts")}</h3>
        <Button variant="secondary" onClick={() => save([...contacts, { ...EMPTY, is_primary: contacts.length === 0 }])}>
          <Plus aria-hidden className="size-4" />
          {t("Add contact")}
        </Button>
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {contacts.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line-strong px-4 py-5 text-center text-sm text-ink-soft">
          {t("No contacts yet.")}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {contacts.map((contact, index) => (
            <li key={index} className="rounded-xl border border-line p-3">
              <div className="grid grid-cols-2 gap-2">
                <input
                  aria-label={t("Name")}
                  placeholder={t("Name")}
                  required
                  value={contact.name}
                  onChange={(event) => update(index, { name: event.target.value })}
                  className={CELL}
                />
                <input
                  aria-label={t("Job title")}
                  placeholder={t("Job title")}
                  value={contact.job_title}
                  onChange={(event) => update(index, { job_title: event.target.value })}
                  className={CELL}
                />
                <input
                  aria-label={t("Phone")}
                  placeholder={t("Phone")}
                  inputMode="tel"
                  value={contact.phone}
                  onChange={(event) => update(index, { phone: event.target.value })}
                  className={CELL}
                />
                <input
                  aria-label={t("Email")}
                  placeholder={t("Email")}
                  type="email"
                  value={contact.email}
                  onChange={(event) => update(index, { email: event.target.value })}
                  className={CELL}
                />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <button
                  type="button"
                  aria-pressed={contact.is_primary}
                  onClick={() => makePrimary(index)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    contact.is_primary
                      ? "bg-accent text-white"
                      : "text-ink-soft hover:bg-surface-muted hover:text-ink"
                  }`}
                >
                  <Star aria-hidden className="size-3.5" fill={contact.is_primary ? "currentColor" : "none"} />
                  {t("Primary contact")}
                </button>
                <IconButton
                  label={t("Remove contact")}
                  onClick={() => save(contacts.filter((_, i) => i !== index))}
                >
                  <Trash2 aria-hidden className="size-4" />
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
