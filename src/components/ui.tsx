"use client";

import { ChevronDown, X } from "lucide-react";
import Link from "next/link";
import {
  type ButtonHTMLAttributes,
  type ComponentProps,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import { ApiError } from "@/lib/api";

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const BUTTON_VARIANTS = {
  primary: "bg-accent text-white hover:bg-accent-strong",
  secondary: "border border-line-strong bg-surface text-ink hover:bg-surface-muted",
  ghost: "text-ink-soft hover:bg-surface-muted hover:text-ink",
  danger: "border border-danger/30 bg-surface text-danger hover:bg-danger-soft",
};

type Variant = keyof typeof BUTTON_VARIANTS;

export function Button({
  variant = "primary",
  pending,
  children,
  disabled,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; pending?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled || pending}
      className={`${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${className}`}
      {...props}
    >
      {pending ? "Working…" : children}
    </button>
  );
}

/** A button that shows only an icon, with its name on hover and keyboard focus. */
export function IconButton({
  label,
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label={label}
        className={`inline-flex size-9 items-center justify-center rounded-lg border border-line-strong bg-surface text-ink transition-colors hover:bg-surface-muted ${className}`}
        {...props}
      >
        {children}
      </button>
      <span
        aria-hidden
        className="pointer-events-none absolute top-full left-1/2 z-50 mt-1.5 -translate-x-1/2 rounded-md bg-panel px-2 py-1 text-xs font-medium whitespace-nowrap text-panel-ink opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-has-[:focus-visible]:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}

export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return (
    <Link className={`${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${className}`} {...props} />
  );
}

const CONTROL =
  "h-10 w-full rounded-lg border border-line-strong bg-surface px-3 text-sm text-ink placeholder:text-ink-faint aria-invalid:border-danger disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-soft";
const TEXTAREA =
  "w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint aria-invalid:border-danger disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-soft";

type FieldProps = { label: string; hint?: string; error?: string };

function FieldShell({
  id,
  label,
  hint,
  error,
  children,
}: FieldProps & { id: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : hint ? (
        <p className="text-sm text-ink-soft">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextField({
  label,
  hint,
  error,
  ...props
}: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <input id={id} aria-invalid={Boolean(error)} className={CONTROL} {...props} />
    </FieldShell>
  );
}

export function TextAreaField({
  label,
  hint,
  error,
  ...props
}: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <textarea id={id} rows={3} aria-invalid={Boolean(error)} className={TEXTAREA} {...props} />
    </FieldShell>
  );
}

export function SelectField({
  label,
  hint,
  error,
  children,
  ...props
}: FieldProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <select id={id} aria-invalid={Boolean(error)} className={`${CONTROL} control-select`} {...props}>
        {children}
      </select>
    </FieldShell>
  );
}

export function CheckboxField({
  label,
  hint,
  ...props
}: { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex items-start gap-2.5 text-sm">
      <input type="checkbox" className="mt-0.5 size-4 accent-[var(--accent)]" {...props} />
      <span>
        <span className="font-medium text-ink">{label}</span>
        {hint ? <span className="block text-ink-soft">{hint}</span> : null}
      </span>
    </label>
  );
}

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      {title ? <h2 className="mb-4 text-base font-bold text-ink">{title}</h2> : null}
      {children}
    </section>
  );
}

const BADGE_TONES = {
  neutral: "bg-surface-muted text-ink-soft",
  success: "bg-accent text-white",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: keyof typeof BADGE_TONES;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${BADGE_TONES[tone]}`}
    >
      {children}
    </span>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
        {description ? <p className="mt-1 text-sm text-ink-soft">{description}</p> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </header>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-line-strong px-6 py-12 text-center">
      <h2 className="text-base font-bold text-ink">{title}</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-ink-soft">{description}</p>
      {action ? <div className="mt-4 flex justify-center gap-2">{action}</div> : null}
    </div>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <p role="status" className="py-10 text-center text-sm text-ink-soft">
      {label}
    </p>
  );
}

export function ErrorBanner({
  error,
  hideFields = false,
}: {
  error: unknown;
  hideFields?: boolean;
}) {
  if (!error) return null;
  const apiError = error instanceof ApiError ? error : null;
  const message = apiError?.message ?? "Something went wrong. Try again.";
  const details = apiError && !hideFields ? Object.entries(apiError.fields) : [];
  return (
    <div role="alert" className="rounded-lg bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
      <p className="font-medium">{message}</p>
      {details.length > 0 ? (
        <ul className="mt-1 list-inside list-disc">
          {details.map(([field, text]) => (
            <li key={field}>{text}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // Otherwise the first control gets a focus ring before anyone has touched it.
      dialog.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      className="m-auto w-[calc(100vw-2rem)] max-w-lg rounded-2xl border border-line bg-surface p-0 text-ink shadow-2xl"
    >
      {open ? (
        <div className="p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="rounded-md p-1.5 text-ink-soft hover:bg-surface-muted"
            >
              <X aria-hidden className="size-4" />
            </button>
          </div>
          {children}
        </div>
      ) : null}
    </dialog>
  );
}

export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
  action,
  large = false,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Sits beside the close button. */
  action?: ReactNode;
  large?: boolean;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // Otherwise the close button takes focus and shows a ring before anyone has touched it.
      dialog.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      tabIndex={-1}
      className={`slide-panel my-0 me-0 ms-auto h-dvh focus:outline-none max-h-dvh w-full border-s border-line bg-surface p-0 text-ink shadow-2xl ${
        large
          ? `${wide ? "max-w-[760px]" : "max-w-[460px]"} overflow-visible border-line/60 shadow-xl`
          : wide
            ? "max-w-4xl"
            : "max-w-md"
      }`}
    >
      {open && large ? (
        <div className="relative flex h-full flex-col">
          {/* Floats just outside the panel on wider screens, inside it on phones. */}
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute top-8 end-5 z-10 inline-flex size-12 items-center justify-center rounded-full border border-line bg-surface text-ink shadow-md hover:bg-surface-muted sm:top-3 sm:end-auto sm:-start-[60px]"
          >
            <X aria-hidden className="size-6" strokeWidth={1.75} />
          </button>
          <div className="flex items-center justify-between gap-4 px-8 pt-8 pb-6 max-sm:pe-20">
            <h2 className="text-[28px] leading-9 font-bold tracking-tight">{title}</h2>
            {action}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-8 pt-2">{children}</div>
          {footer ? <div className="px-8 pt-4 pb-6">{footer}</div> : null}
        </div>
      ) : open ? (
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
            <h2 className="text-lg font-semibold">{title}</h2>
            <div className="flex items-center gap-2">
              {action}
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="rounded-md p-1.5 text-ink-soft hover:bg-surface-muted"
              >
                <X aria-hidden className="size-4" />
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
          {footer ? <div className="border-t border-line px-5 py-4">{footer}</div> : null}
        </div>
      ) : null}
    </dialog>
  );
}

/**
 * A wide panel that slides in from the right: an optional narrow column on the left, a coloured
 * header, a scrolling body and a footer. The close button floats just outside its left edge.
 */
export function SlidePanel({
  title,
  onClose,
  aside,
  header,
  headerColor = "#2f78ef",
  footer,
  overlay,
  overlayMotion = "slide",
  sideButtons,
  children,
  widthClass = "max-w-[640px]",
}: {
  title: string;
  onClose: () => void;
  aside?: ReactNode;
  /** Covers the whole panel, such as the client chooser. */
  overlay?: ReactNode;
  /** How the overlay arrives: sliding in, or fading in while the panel widens. */
  overlayMotion?: "slide" | "fade";
  /** Round buttons stacked under the close button, outside the panel. */
  sideButtons?: ReactNode;
  header: ReactNode;
  headerColor?: string;
  footer?: ReactNode;
  children: ReactNode;
  widthClass?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
      // Otherwise the first control gets a focus ring before anyone has touched it.
      dialog.focus();
    }
  }, []);

  // Slides back out before the panel is removed.
  const close = () => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(onClose, 220);
  };

  return (
    <dialog
      ref={ref}
      aria-label={title}
      tabIndex={-1}
      data-closing={closing ? "" : undefined}
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      className={`slide-panel my-0 me-0 ms-auto h-dvh max-h-dvh w-full ${widthClass} overflow-visible border-s border-line bg-surface p-0 text-ink shadow-2xl transition-[max-width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] focus:outline-none`}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={close}
        className="absolute top-8 end-4 z-10 inline-flex size-12 items-center justify-center rounded-full border border-line bg-surface text-ink shadow-md hover:bg-surface-muted sm:top-5 sm:end-auto sm:-start-[60px]"
      >
        <X aria-hidden className="size-6" strokeWidth={1.75} />
      </button>
      {sideButtons ? (
        <div className="absolute top-[84px] -start-[60px] z-10 hidden flex-col gap-3 sm:flex">
          {sideButtons}
        </div>
      ) : null}
      <div className="flex h-full">
        {aside}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="px-8 pt-7 pb-6 text-white" style={{ backgroundColor: headerColor }}>
            {header}
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">{children}</div>
          {footer ? <footer className="px-8 pt-4 pb-6">{footer}</footer> : null}
        </div>
      </div>
      {overlay ? (
        <div
          className="absolute inset-0 z-20 flex flex-col overflow-hidden bg-surface"
          style={{
            animation:
              overlayMotion === "fade"
                ? "profile-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) backwards"
                : "panel-in 0.28s cubic-bezier(0.22, 1, 0.36, 1) backwards",
          }}
        >
          {overlay}
        </div>
      ) : null}
    </dialog>
  );
}

/** Floats over its surroundings, so scrolling containers can't clip it. */
export function Menu({
  label,
  children,
  align = "start",
  variant = "secondary",
  keepOpen = false,
  chevron = true,
  title,
  ariaLabel,
  className = "",
  menuClassName = "",
  wrapperClassName = "inline-block",
}: {
  label: ReactNode;
  children: ReactNode;
  /** Which edge of the button the list lines up with, in reading direction. */
  align?: "start" | "end";
  /** Classes for the box around the button, for a menu that should fill its row. */
  wrapperClassName?: string;
  variant?: Variant;
  keepOpen?: boolean;
  chevron?: boolean;
  /** Shown on hover, for a button that only has an icon. */
  title?: string;
  /** A fuller name for screen readers, when the visible label is shared by many buttons. */
  ariaLabel?: string;
  className?: string;
  /** Extra classes for the floating list itself. */
  menuClassName?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<{
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  } | null>(null);

  useEffect(() => {
    if (!place) return;
    const close = () => setPlace(null);
    const outside = (event: Event) => {
      if (!box.current?.contains(event.target as Node)) close();
    };
    const key = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Closes just this menu, not the panel it sits in.
      event.preventDefault();
      close();
    };
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", key);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", key);
      window.removeEventListener("resize", close);
    };
  }, [place]);

  const toggle = () => {
    if (place) {
      setPlace(null);
      return;
    }
    const bounds = box.current?.getBoundingClientRect();
    if (!bounds) return;
    // Near the bottom of the screen the list opens upward instead.
    const vertical =
      bounds.bottom > window.innerHeight * 0.65
        ? { bottom: window.innerHeight - bounds.top + 4 }
        : { top: bounds.bottom + 4 };
    // "start"/"end" follow the reading direction: in Arabic, "end" is the left edge.
    const rtl = document.documentElement.dir === "rtl";
    const alignRight = (align === "end") !== rtl;
    setPlace(
      alignRight
        ? { ...vertical, right: window.innerWidth - bounds.right }
        : { ...vertical, left: bounds.left },
    );
  };

  return (
    <div ref={box} className={wrapperClassName}>
      <Button
        variant={variant}
        aria-haspopup="menu"
        aria-expanded={Boolean(place)}
        aria-label={ariaLabel}
        title={title}
        className={className}
        onClick={toggle}
      >
        {label}
        {chevron ? <ChevronDown aria-hidden className="size-4" /> : null}
      </Button>
      {place ? (
        <div
          role="menu"
          style={place}
          className={`fixed z-40 max-h-[70dvh] min-w-56 overflow-y-auto rounded-xl border border-line bg-surface p-1.5 text-ink shadow-lg ${menuClassName}`}
          onClick={() => {
            if (!keepOpen) setPlace(null);
          }}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

const MENU_ITEM =
  "block w-full rounded-lg px-3 py-2 text-start text-sm font-normal text-ink hover:bg-surface-muted aria-checked:bg-accent-soft";

export function MenuItem({
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" role="menuitem" className={MENU_ITEM} {...props}>
      {children}
    </button>
  );
}

export function MenuLink(props: ComponentProps<typeof Link>) {
  return <Link role="menuitem" className={MENU_ITEM} {...props} />;
}

export function MenuHeading({ children }: { children: ReactNode }) {
  return <p className="px-3 pt-2 pb-1 text-xs font-medium text-ink-soft">{children}</p>;
}

export function MenuDivider() {
  return <hr className="my-1 border-line" />;
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="w-full min-w-[32rem] text-start text-sm">
        <thead className="border-b border-line bg-surface-muted/60 text-xs tracking-wide text-ink-soft uppercase">
          <tr>
            {head.map((label) => (
              <th key={label} scope="col" className="px-4 py-2.5 text-start font-medium">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line [&>tr]:transition-colors [&>tr:hover]:bg-surface-muted/50">
          {children}
        </tbody>
      </table>
    </div>
  );
}
