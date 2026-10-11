"use client";

import Link from "next/link";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#d8c7a5] bg-[#fbf8f1]/95 backdrop-blur-md shadow-xs">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        {/* College Crest & Ayurvedic Identity */}
        <Link href="/" className="flex items-center gap-3.5 group">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1b4332] to-[#2d6a4f] text-[#fbf8f1] shadow-md shadow-[#1b4332]/25 ring-2 ring-[#c28b26]/50 group-hover:scale-105 transition-transform">
            <span className="text-2xl" role="img" aria-label="Ayurveda Tree">
              🌿
            </span>
          </div>
          <div>
            <div className="text-[10px] font-bold tracking-widest text-[#9a6714] uppercase">
              Girivihar Trust Governed
            </div>
            <div className="text-base font-extrabold tracking-tight text-[#1b4332] font-serif">
              Shree R.M.D. Ayurved College & Hospital
            </div>
            <div className="text-[11px] font-medium text-[#52796f]">
              Waghaldhara, Dist. Valsad, Gujarat
            </div>
          </div>
        </Link>

        {/* Sanskrit Motto / Vedic Badge */}
        <div className="hidden md:flex flex-col items-end">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#c28b26]/40 bg-[#fdf5e6] px-3 py-1 text-xs font-semibold text-[#8c591b]">
            <span className="text-xs">🪷</span>
            <span>॥ स्वस्थस्य स्वास्थ्य रक्षणम् ॥</span>
          </div>
          <span className="text-[10px] text-[#6b705c] mt-0.5">
            11th National Ayurveda Day Portal
          </span>
        </div>
      </div>
    </header>
  );
}
