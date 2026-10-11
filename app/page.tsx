import CertificateForm from "@/components/CertificateForm";

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
      {/* Ayurvedic Hero Section */}
      <div className="mb-10 text-center">
        {/* Event Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-[#c28b26]/50 bg-[#fdf5e6] px-4 py-1.5 text-xs font-bold text-[#8c591b] shadow-xs">
          <span className="text-sm">🌿</span>
          <span>11th National Ayurveda Day Celebration (राष्ट्रीय आयुर्वेद दिवस)</span>
        </div>

        {/* Main Title */}
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[#1b4332] sm:text-5xl font-serif">
          Certificate of Participant
        </h1>

        {/* Sanskrit Shloka Banner */}
        <div className="mx-auto mt-3 max-w-xl rounded-xl border border-[#d8c7a5] bg-[#fffdfa] px-4 py-2 text-xs sm:text-sm font-serif font-bold text-[#9a6714] shadow-xs">
          ॥ स्वस्थस्य स्वास्थ्य रक्षणं आतुरस्य विकारप्रशमनं च ॥
        </div>

        <p className="mx-auto mt-3 max-w-2xl text-sm sm:text-base text-[#406a52]">
          Held at Shree R.M.D. Ayurved College & Hospital, Waghaldhara Dist. Valsad, Gujarat.
          Enter your name and competition details below to generate and download your official certificate.
        </p>

        {/* Feature Badges */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-[#1b4332]">
          <div className="flex items-center gap-1.5 rounded-full border border-[#d8c7a5] bg-[#fffdfa] px-3.5 py-1.5 shadow-2xs">
            <span className="text-emerald-700 font-bold">✓</span> Official High-Res Template
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-[#d8c7a5] bg-[#fffdfa] px-3.5 py-1.5 shadow-2xs">
            <span className="text-emerald-700 font-bold">✓</span> Real-Time PDF Stamping
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-[#d8c7a5] bg-[#fffdfa] px-3.5 py-1.5 shadow-2xs">
            <span className="text-emerald-700 font-bold">✓</span> Saved to Database
          </div>
        </div>
      </div>

      {/* Main Certificate Form Component */}
      <CertificateForm />

      {/* Step Guide with Ayurvedic aesthetic */}
      <div className="mt-14 grid gap-5 sm:grid-cols-3 text-[#406a52]">
        <div className="rounded-2xl border border-[#d8c7a5] bg-[#fffdfa] p-5 shadow-xs">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eaf4ec] text-sm font-bold text-[#1b4332] ring-1 ring-[#2d6a4f]/20">
            1
          </div>
          <h4 className="mt-3 font-serif font-bold text-base text-[#1b4332]">
            विद्यार्थी विवरण (Enter Details)
          </h4>
          <p className="mt-1 text-xs text-[#52796f] leading-relaxed">
            Fill in your full first name, last name, email address, and select the competition in which you participated.
          </p>
        </div>

        <div className="rounded-2xl border border-[#d8c7a5] bg-[#fffdfa] p-5 shadow-xs">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fdf5e6] text-sm font-bold text-[#9a6714] ring-1 ring-[#c28b26]/30">
            2
          </div>
          <h4 className="mt-3 font-serif font-bold text-base text-[#1b4332]">
            पूर्वावलोकन (Live Preview)
          </h4>
          <p className="mt-1 text-xs text-[#52796f] leading-relaxed">
            Click 'Show Live Preview' to inspect your certificate on screen and ensure your name spelling is exact.
          </p>
        </div>

        <div className="rounded-2xl border border-[#d8c7a5] bg-[#fffdfa] p-5 shadow-xs">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eaf4ec] text-sm font-bold text-[#1b4332] ring-1 ring-[#2d6a4f]/20">
            3
          </div>
          <h4 className="mt-3 font-serif font-bold text-base text-[#1b4332]">
            प्रमाणपत्र डाउनलोड (Download PDF)
          </h4>
          <p className="mt-1 text-xs text-[#52796f] leading-relaxed">
            Click download to receive your authentic signed PDF. Your details and download time are securely archived in the database.
          </p>
        </div>
      </div>
    </main>
  );
}
