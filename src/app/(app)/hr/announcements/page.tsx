"use client";

import { Mail, Megaphone, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Badge, Button, EmptyState, ErrorBanner, Loading, Modal, PageHeader, TextAreaField, TextField } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { onSubmit, useAction, useResource } from "@/lib/hooks";
import type { Announcement, Page } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

function Composer({ onDone }: { onDone: () => void }) {
  const { branches, company, name, t } = useWorkspace();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [everyone, setEveryone] = useState(true);
  const [chosen, setChosen] = useState<number[]>([]);
  const [until, setUntil] = useState("");
  const [email, setEmail] = useState(false);
  const save = useAction();
  const toggle = (id: number) => setChosen(chosen.includes(id) ? chosen.filter((item) => item !== id) : [...chosen, id]);
  const send = () => save.run(async () => {
    await api.post("/hr/announcements", { company: company.id, title, body, branches: everyone ? [] : chosen, show_until: until || null, send_email: email });
    onDone();
  });
  return (
    <form onSubmit={onSubmit(send)} className="flex flex-col gap-4">
      <ErrorBanner error={save.error} />
      <TextField label={t("Title")} required autoFocus value={title} onChange={(e) => setTitle(e.target.value)} error={save.field("title")} placeholder="e.g. Eid holiday: showrooms closed on Monday" />
      <TextAreaField label={t("Message")} required rows={5} value={body} onChange={(e) => setBody(e.target.value)} error={save.field("body")} />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">{t("Send to")}</legend>
        <div className="flex flex-wrap gap-2">
          {[[true, t("Everyone")], [false, t("Chosen stores")]].map(([value, label]) => (
            <button key={String(value)} type="button" role="radio" aria-checked={everyone === value} onClick={() => setEveryone(value as boolean)} className={`h-10 rounded-full border px-4 text-sm font-medium ${everyone === value ? "border-accent bg-accent text-white" : "border-line-strong bg-surface hover:bg-surface-muted"}`}>{label}</button>
          ))}
        </div>
        {!everyone ? (
          <div className="grid gap-1.5 sm:grid-cols-2">
            {branches.map((item) => (
              <label key={item.id} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${chosen.includes(item.id) ? "border-accent bg-accent/5" : "border-line"}`}>
                <input type="checkbox" checked={chosen.includes(item.id)} onChange={() => toggle(item.id)} className="size-4 accent-accent" />{name(item)}
              </label>
            ))}
          </div>
        ) : null}
        {save.field("branches") ? <p className="text-sm text-danger">{save.field("branches")}</p> : null}
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label={`${t("Show until")} (${t("optional")})`} type="date" value={until} onChange={(e) => setUntil(e.target.value)} hint="Empty: until each person ticks it off." />
        <label className="flex cursor-pointer items-start gap-2 self-center text-sm">
          <input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} className="mt-0.5 size-4 accent-accent" />
          <span><span className="font-medium">{t("Also send by email")}</span><span className="block text-xs text-ink-soft">{t("To employees with an email address on their record.")}</span></span>
        </label>
      </div>
      <p className="text-xs text-ink-soft">{t("Everyone it is for sees it under the bell until they tick it off.")}</p>
      <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onDone}>{t("Cancel")}</Button><Button type="submit" pending={save.pending} disabled={!title.trim() || !body.trim() || (!everyone && !chosen.length)}><Megaphone aria-hidden className="size-4" />{t("Send announcement")}</Button></div>
    </form>
  );
}

export default function AnnouncementsPage() {
  const { can, company, locale, t } = useWorkspace();
  const list = useResource<Page<Announcement>>(`/hr/announcements?company=${company.id}&page_size=100`);
  const [writing, setWriting] = useState(false);
  const remove = useAction();
  const rows = list.data?.results ?? [];
  return (
    <>
      <PageHeader
        title={t("Announcements")}
        description="Messages from management to all employees or the staff of chosen stores. They appear under the bell, and can also go by email."
        actions={can("hr.announcement.create") ? <Button onClick={() => setWriting(true)}><Plus aria-hidden className="size-5" />{t("New announcement")}</Button> : null}
      />
      <ErrorBanner error={list.error ?? remove.error} />
      {!list.data ? (list.error ? null : <Loading label={t("Loading…")} />) : rows.length === 0 ? (
        <EmptyState title={t("No announcements yet")} description={t("Send one to everyone, or to the staff of chosen stores.")} action={can("hr.announcement.create") ? <Button onClick={() => setWriting(true)}><Plus aria-hidden className="size-5" />{t("New announcement")}</Button> : undefined} />
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <li key={row.id} className="rounded-xl border border-line bg-surface p-4">
              <div className="flex flex-wrap items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-muted"><Megaphone aria-hidden className="size-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{row.title}</p>
                  <p className="text-xs text-ink-soft">{[row.sender_name, formatDate(row.created_at.slice(0, 10), locale), row.show_until ? `${t("Showing until")} ${formatDate(row.show_until, locale)}` : null].filter(Boolean).join(" · ")}</p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {row.branch_names.length ? row.branch_names.map((store) => <Badge key={store}>{store}</Badge>) : <Badge>{t("Everyone")}</Badge>}
                  {row.send_email ? <Badge tone="neutral"><Mail aria-hidden className="me-1 inline size-3" />{row.emailed}</Badge> : null}
                  <span className="text-xs text-ink-soft">{t("Seen by")} {row.read_count}</span>
                  {can("hr.announcement.delete") ? <Button variant="ghost" className="h-8 px-2" aria-label={t("Delete")} pending={remove.pending} onClick={() => window.confirm(t("Delete this announcement? People who haven't seen it won't get it.")) && remove.run(async () => { await api.delete(`/hr/announcements/${row.id}`); await list.mutate(); })}><Trash2 aria-hidden className="size-4" /></Button> : null}
                </div>
              </div>
              <p className="mt-3 text-[15px] whitespace-pre-line">{row.body}</p>
            </li>
          ))}
        </ul>
      )}
      {writing ? <Modal open onClose={() => setWriting(false)} title={t("New announcement")}><Composer onDone={() => { setWriting(false); list.mutate(); }} /></Modal> : null}
    </>
  );
}
