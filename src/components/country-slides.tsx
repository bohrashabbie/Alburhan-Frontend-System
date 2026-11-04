"use client";

import Image, { type StaticImageData } from "next/image";
import { useEffect, useState } from "react";

import china from "../../public/auth/china.jpg";
import egypt from "../../public/auth/egypt.jpg";
import kuwait from "../../public/auth/kuwait.jpg";
import uae from "../../public/auth/uae.jpg";

/** The group's countries, with the banner photos used on alburhan-regional.com. */
const SLIDES: { code: string; name: string; image: StaticImageData }[] = [
  { code: "KW", name: "Kuwait", image: kuwait },
  { code: "AE", name: "United Arab Emirates", image: uae },
  { code: "CN", name: "China", image: china },
  { code: "EG", name: "Egypt", image: egypt },
];
const SECONDS = 6;

/** Cross-fading country photographs with a slow zoom, the current country's flag and progress bars. */
export function CountrySlides() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    // Without motion, the first photograph simply stays.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), SECONDS * 1000);
    return () => window.clearInterval(timer);
  }, []);

  const current = SLIDES[index];

  return (
    <>
      {SLIDES.map((slide, i) => (
        <div
          key={slide.code}
          className={`absolute inset-0 transition-opacity duration-[1400ms] ease-in-out ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
        >
          <Image
            // A new key restarts the zoom each time the slide comes back.
            key={i === index ? `${slide.code}-on` : slide.code}
            src={slide.image}
            alt=""
            fill
            priority={i === 0}
            sizes="50vw"
            placeholder="blur"
            // Anchored to the top so towers and spires are never cut; any crop falls behind the caption.
            className={`origin-top object-cover object-top ${i === index ? "hero-photo" : ""}`}
          />
        </div>
      ))}

      {/* Darkens the lower part so the caption always reads. */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/25" />

      <div className="hero-caption absolute start-14 end-14 bottom-12 text-white">
        <p className="text-[56px] leading-none font-bold tracking-tight">Al-Burhan</p>
        <p className="mt-3 text-lg text-white/75">Lighting the region since 2004.</p>

        <div className="mt-8 flex items-center justify-between gap-6">
          <p key={current.code} className="country-in flex items-center gap-2.5 text-[15px] font-medium">
            {/* eslint-disable-next-line @next/next/no-img-element -- static flag SVG */}
            <img
              src={`/flags/${current.code}.svg`}
              alt=""
              className="h-4 rounded-[2px] shadow-[0_0_0_1px_rgb(255_255_255/0.25)]"
            />
            {current.name}
          </p>
          <div className="flex gap-1.5">
            {SLIDES.map((slide, i) => (
              <span key={slide.code} className="relative h-[3px] w-8 overflow-hidden rounded-full bg-white/25">
                {i === index ? (
                  <span
                    className="slide-progress absolute inset-0 origin-left rounded-full bg-white rtl:origin-right"
                    style={{ animationDuration: `${SECONDS}s` }}
                  />
                ) : i < index ? (
                  <span className="absolute inset-0 rounded-full bg-white/70" />
                ) : null}
              </span>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
