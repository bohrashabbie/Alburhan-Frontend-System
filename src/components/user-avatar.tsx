"use client";

import { initials } from "@/lib/format";

/** A round profile photo, or the person's initials on the soft blue disc when there is none. */
export function UserAvatar({ url, name, size = "size-9", text = "text-sm", ring = true }: { url?: string | null; name: string; size?: string; text?: string; ring?: boolean }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element -- signed S3 link, changes per request
    <img src={url} alt="" className={`${size} shrink-0 rounded-full object-cover ${ring ? "border-2 border-[#a8dcf5]" : ""}`} />
  ) : (
    <span aria-hidden className={`flex ${size} shrink-0 items-center justify-center rounded-full bg-[#e6f6fd] font-semibold text-[#0b7cab] ${text} ${ring ? "border-2 border-[#a8dcf5]" : ""}`}>
      {initials(name)}
    </span>
  );
}
