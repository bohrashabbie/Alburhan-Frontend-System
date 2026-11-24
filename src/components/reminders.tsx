"use client";

import { Bell, Check } from "lucide-react";
import { useState } from "react";

import { Button, ErrorBanner, Modal, SelectField, TextAreaField, TextField } from "@/components/ui";
import { api } from "@/lib/api";
import { useAction, useResource } from "@/lib/hooks";
import { useWorkspace } from "@/lib/workspace";

type Reminder = { id: number; sender_name: string; recipient_name: string; message: string; remind_on: string | null; created_at: string };

/**
 * The bell in the top bar: notes colleagues sent you (tick one off when it is dealt with), and a
 * form to send one, optionally to show from a later day.
 */
export function Reminders() {
  const { locale, t } = useWorkspace();
  const inbox = useResource<Reminder[]>("/reminders");
  const [open, setOpen] = useState(false);
  const [writing, setWriting] = useState(false);
  const colleagues = useResource<{ id: number; name: string }[]>(open && writing ? "/reminders/colleagues" : null);
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("");
  const [day, setDay] = useState("");
  const action = useAction();
  const count = inbox.data?.length ?? 0;
  const when = new Intl.DateTimeFormat(locale === "ar" ? "ar-KW-u-nu-latn" : "en-GB", { dateStyle: "medium", timeStyle: "short" });

  const done = (id: number) => action.run(async () => { await api.post(`/reminders/${id}/done/`); await inbox.mutate(); });
  const send = () =>
    action.run(async () => {
      await api.post("/reminders/", { recipient: Number(to), message, remind_on: day || null });
      setMessage(""); setDay(""); setTo(""); setWriting(false);
    });

  return (
    <>
      <button
        type="button"
        aria-label={`${t("Notifications")}${count ? ` (${count})` : ""}`}
        title={t("Notifications")}
        onClick={() => setOpen(true)}
        className="relative inline-flex size-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-surface-muted"
      >
        <Bell aria-hidden className="size-5" strokeWidth={1.75} />
        {count ? <span className="absolute end-1 top-1 flex min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[11px] leading-[18px] font-semibold text-white">{count > 9 ? "9+" : count}</span> : null}
      </button>
      <Modal open={open} onClose={() => { setOpen(false); setWriting(false); action.clear(); }} title={t(writing ? "Send notification" : "Notifications")}>
        <ErrorBanner error={action.error} />
        {writing ? (
          <div className="flex flex-col gap-4">
            <SelectField label={t("To")} value={to} onChange={(e) => setTo(e.target.value)} error={action.field("recipient")}>
              <option value="">—</option>
              {(colleagues.data ?? []).map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
            </SelectField>
            <TextAreaField label={t("Message")} value={message} onChange={(e) => setMessage(e.target.value)} error={action.field("message")} />
            <TextField label={t("Reminder date")} type="date" value={day} onChange={(e) => setDay(e.target.value)} hint="Empty = they see it straight away." />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setWriting(false)}>{t("Back")}</Button>
              <Button disabled={!to || !message.trim()} pending={action.pending} onClick={send}>{t("Send")}</Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {count === 0 ? <p className="py-4 text-center text-sm text-ink-soft">{t("Nothing waiting for you.")}</p> : (
              <ul className="max-h-80 divide-y divide-line overflow-y-auto">
                {(inbox.data ?? []).map((item) => (
                  <li key={item.id} className="flex items-start gap-3 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] whitespace-pre-wrap">{item.message}</span>
                      <span className="mt-0.5 block text-xs text-ink-soft">{item.sender_name} · {when.format(new Date(item.created_at))}</span>
                    </span>
                    <Button variant="secondary" className="!h-8 !px-3 !text-xs" pending={action.pending} onClick={() => done(item.id)}><Check aria-hidden className="size-4" />{t("Done")}</Button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex justify-end"><Button onClick={() => setWriting(true)}>{t("Send notification")}</Button></div>
          </div>
        )}
      </Modal>
    </>
  );
}
