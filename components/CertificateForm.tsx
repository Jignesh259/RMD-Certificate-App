"use client";

import { useEffect, useState, useId } from "react";
import dynamic from "next/dynamic";
import { COMPETITIONS } from "@/lib/competitions";
import { validateStudentInput, StudentInput } from "@/lib/validation";

const PdfPreview = dynamic(() => import("./PdfPreview"), {
  ssr: false,
  loading: () => (
    <div className="flex h-96 w-full items-center justify-center rounded-2xl border border-dashed border-[#d8c7a5] bg-[#fffdfa]">
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1b4332] border-t-transparent" />
        <span className="text-xs text-[#52796f]">प्रमाणपत्र तैयार हो रहा है (Loading certificate engine)...</span>
      </div>
    </div>
  ),
});

interface FormErrors {
  first_name?: string;
  last_name?: string;
  email?: string;
  competition?: string;
}

export default function CertificateForm() {
  const firstNameId = useId();
  const lastNameId = useId();
  const emailId = useId();
  const competitionId = useId();

  const [form, setForm] = useState<StudentInput>({
    first_name: "",
    last_name: "",
    email: "",
    competition: "REEL MAKING COMPITITION",
  });

  const [touched, setTouched] = useState<Record<keyof StudentInput, boolean>>({
    first_name: false,
    last_name: false,
    email: false,
    competition: false,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [competitions, setCompetitions] = useState<string[]>([
    "REEL MAKING COMPITITION",
    ...COMPETITIONS,
  ]);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isDownloadLoading, setIsDownloadLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [alreadyDownloaded, setAlreadyDownloaded] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/competitions")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.competitions && Array.isArray(data.competitions)) {
          const merged = Array.from(new Set(["REEL MAKING COMPITITION", ...data.competitions]));
          setCompetitions(merged);
        }
      })
      .catch((err) => {
        console.warn("Could not fetch remote competitions, using default:", err);
      });
  }, []);

  const runValidation = (data: StudentInput): boolean => {
    const res = validateStudentInput(data);
    setErrors(res.errors);
    return res.isValid;
  };

  const handleBlur = (field: keyof StudentInput) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    runValidation(form);
  };

  const handleChange = (field: keyof StudentInput, value: string) => {
    const updated = { ...form, [field]: value };
    setForm(updated);
    setServerError(null);
    setSuccessMessage(null);
    setIsVerified(null);
    setAlreadyDownloaded(false);

    if (pdfBlobUrl) {
      URL.revokeObjectURL(pdfBlobUrl);
      setPdfBlobUrl(null);
    }

    if (touched[field]) {
      runValidation(updated);
    }
  };

  const fillSampleData = (sampleNum: number = 1) => {
    const samples: StudentInput[] = [
      {
        first_name: "Rudra",
        last_name: "Joshi",
        email: "rudrajoshi09022007@gmail.com",
        competition: "REEL MAKING COMPITITION",
      },
      {
        first_name: "Vaidik",
        last_name: "Parmar",
        email: "vaidikparmar73@gmail.com",
        competition: "REEL MAKING COMPITITION",
      },
      {
        first_name: "Jash",
        last_name: "Patel",
        email: "jashpatel296@gmail.com",
        competition: "REEL MAKING COMPITITION",
      },
    ];

    const chosen = samples[sampleNum - 1] || samples[0];
    setForm(chosen);
    setTouched({
      first_name: true,
      last_name: true,
      email: true,
      competition: true,
    });
    setErrors({});
    setServerError(null);
    setIsVerified(null);
    setAlreadyDownloaded(false);
    setSuccessMessage(`Sample verified participant data filled for ${chosen.first_name} ${chosen.last_name}. Click 'Verify & Preview Certificate'.`);
  };

  const resetForm = () => {
    if (pdfBlobUrl) {
      URL.revokeObjectURL(pdfBlobUrl);
      setPdfBlobUrl(null);
    }
    setForm({
      first_name: "",
      last_name: "",
      email: "",
      competition: "REEL MAKING COMPITITION",
    });
    setTouched({
      first_name: false,
      last_name: false,
      email: false,
      competition: false,
    });
    setErrors({});
    setServerError(null);
    setSuccessMessage(null);
    setIsVerified(null);
    setAlreadyDownloaded(false);
  };

  const handleVerifyAndPreview = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    setTouched({
      first_name: true,
      last_name: true,
      email: true,
      competition: true,
    });

    const isValid = runValidation(form);
    if (!isValid) {
      setServerError("Please enter valid student details before proceeding.");
      return;
    }

    setIsVerifying(true);
    setIsPreviewLoading(true);
    setServerError(null);
    setSuccessMessage(null);

    try {
      // Step 1: Verification Check against Sheet 2 participation database & 1-time download lock
      const verifyRes = await fetch("/api/verify-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const verifyData = await verifyRes.json();

      if (!verifyData.verified) {
        setIsVerified(false);
        setServerError(verifyData.message || "Student record not found in participation sheet.");
        setIsPreviewLoading(false);
        setIsVerifying(false);
        return;
      }

      if (verifyData.alreadyDownloaded) {
        setIsVerified(true);
        setAlreadyDownloaded(true);
        setServerError(verifyData.message || "Certificate already downloaded. Each student can download only once.");
        setIsPreviewLoading(false);
        setIsVerifying(false);
        return;
      }

      setIsVerified(true);
      setAlreadyDownloaded(false);

      // Step 2: Render Live Preview PDF
      const res = await fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to generate preview PDF");
      }

      const blob = await res.blob();
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
      const newUrl = URL.createObjectURL(blob);
      setPdfBlobUrl(newUrl);
      setSuccessMessage("✅ Verification Success! Participant record found in Sheet 2. Preview generated below.");
    } catch (err: any) {
      setServerError(err?.message || "An error occurred during verification.");
    } finally {
      setIsVerifying(false);
      setIsPreviewLoading(false);
    }
  };

  const handleDownload = async () => {
    setTouched({
      first_name: true,
      last_name: true,
      email: true,
      competition: true,
    });

    const isValid = runValidation(form);
    if (!isValid) {
      setServerError("Please resolve validation errors before downloading.");
      return;
    }

    setIsDownloadLoading(true);
    setServerError(null);

    try {
      const res = await fetch("/api/certificate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (errorData.errors) {
          setErrors(errorData.errors);
        }
        throw new Error(errorData.error || "Failed to download certificate");
      }

      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;

      const disposition = res.headers.get("Content-Disposition");
      let filename = `${form.first_name}_${form.last_name}_${form.competition}.pdf`.replace(/\s+/g, "_");
      if (disposition && disposition.includes("filename=")) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) filename = match[1];
      }

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      setAlreadyDownloaded(true);
      setSuccessMessage(`🎉 Certificate "${filename}" downloaded successfully! Download record saved to Sheet 1 with Authorized status. Your single-download access is now completed.`);
    } catch (err: any) {
      setServerError(err?.message || "An error occurred during download.");
    } finally {
      setIsDownloadLoading(false);
    }
  };

  const isFormFilled =
    Boolean(form.first_name.trim()) &&
    Boolean(form.last_name.trim()) &&
    Boolean(form.email.trim()) &&
    Boolean(form.competition);

  return (
    <div className="space-y-8">
      {/* Form Card with Ayurvedic aesthetics */}
      <div className="overflow-hidden rounded-3xl border-2 border-[#d8c7a5] bg-[#fffdfa] p-6 shadow-xl sm:p-10">
        <div className="mb-8 flex flex-col items-start justify-between gap-4 border-b border-[#e6dcc8] pb-6 sm:flex-row sm:items-center">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#1b4332]/10 px-3 py-1 text-xs font-semibold text-[#1b4332]">
              <span>🎓 Official Student Download Portal</span>
            </div>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-[#1b4332] font-serif sm:text-3xl">
              Download Certificate of Participation
            </h1>
            <p className="mt-1 text-sm text-[#52796f]">
              Enter your registered credentials to verify eligibility in Sheet 2 and download your official certificate.
            </p>
          </div>

          {/* Preset Fill Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-[#8c591b]">Sample Verified Students:</span>
            <button
              type="button"
              onClick={() => fillSampleData(1)}
              className="rounded-lg border border-[#c28b26]/30 bg-[#fdf5e6] px-2.5 py-1 text-xs font-semibold text-[#8c591b] hover:bg-[#fcecd2] transition-colors"
            >
              Rudra Joshi
            </button>
            <button
              type="button"
              onClick={() => fillSampleData(2)}
              className="rounded-lg border border-[#c28b26]/30 bg-[#fdf5e6] px-2.5 py-1 text-xs font-semibold text-[#8c591b] hover:bg-[#fcecd2] transition-colors"
            >
              Vaidik Parmar
            </button>
          </div>
        </div>

        {/* Verification Status Banner */}
        {isVerified === false && serverError && (
          <div className="mb-6 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 shadow-xs">
            <div className="flex items-start gap-3">
              <span className="text-xl">🚫</span>
              <div>
                <span className="font-bold">Verification Failed / Unauthorized:</span>
                <p className="mt-1">{serverError}</p>
                <p className="mt-2 text-xs text-red-700 font-medium">
                  Note: Student certificates are restricted to registered participants listed in Sheet 2. Check your spelling or email address.
                </p>
              </div>
            </div>
          </div>
        )}

        {alreadyDownloaded && (
          <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 shadow-xs">
            <div className="flex items-start gap-3">
              <span className="text-xl">🔒</span>
              <div>
                <span className="font-bold">1-Time Download Limit Reached:</span>
                <p className="mt-1">{serverError || "You have already downloaded your official certificate. Each participant is allowed 1 download."}</p>
              </div>
            </div>
          </div>
        )}

        {isVerified === true && !alreadyDownloaded && successMessage && (
          <div className="mb-6 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900 shadow-xs">
            <div className="flex items-start gap-3">
              <span className="text-xl">✅</span>
              <div>
                <span className="font-bold">Authorized Participant Verified:</span>
                <p className="mt-1">{successMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Form Grid */}
        <form onSubmit={handleVerifyAndPreview} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* First Name */}
            <div>
              <label htmlFor={firstNameId} className="block text-xs font-bold uppercase tracking-wider text-[#1b4332]">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                id={firstNameId}
                type="text"
                value={form.first_name}
                onChange={(e) => handleChange("first_name", e.target.value)}
                onBlur={() => handleBlur("first_name")}
                placeholder="e.g. Rudra"
                className={`mt-1.5 w-full rounded-xl border ${
                  touched.first_name && errors.first_name
                    ? "border-red-500 bg-red-50/50"
                    : "border-[#d8c7a5] bg-white focus:border-[#1b4332] focus:ring-2 focus:ring-[#1b4332]/20"
                } px-4 py-3 text-sm text-[#1b4332] placeholder-[#a39478] shadow-xs outline-none transition-all`}
              />
              {touched.first_name && errors.first_name && (
                <p className="mt-1 text-xs text-red-600 font-medium">{errors.first_name}</p>
              )}
            </div>

            {/* Last Name */}
            <div>
              <label htmlFor={lastNameId} className="block text-xs font-bold uppercase tracking-wider text-[#1b4332]">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                id={lastNameId}
                type="text"
                value={form.last_name}
                onChange={(e) => handleChange("last_name", e.target.value)}
                onBlur={() => handleBlur("last_name")}
                placeholder="e.g. Joshi"
                className={`mt-1.5 w-full rounded-xl border ${
                  touched.last_name && errors.last_name
                    ? "border-red-500 bg-red-50/50"
                    : "border-[#d8c7a5] bg-white focus:border-[#1b4332] focus:ring-2 focus:ring-[#1b4332]/20"
                } px-4 py-3 text-sm text-[#1b4332] placeholder-[#a39478] shadow-xs outline-none transition-all`}
              />
              {touched.last_name && errors.last_name && (
                <p className="mt-1 text-xs text-red-600 font-medium">{errors.last_name}</p>
              )}
            </div>

            {/* Email Address */}
            <div>
              <label htmlFor={emailId} className="block text-xs font-bold uppercase tracking-wider text-[#1b4332]">
                Email ID (Registered) <span className="text-red-500">*</span>
              </label>
              <input
                id={emailId}
                type="email"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                onBlur={() => handleBlur("email")}
                placeholder="e.g. rudrajoshi09022007@gmail.com"
                className={`mt-1.5 w-full rounded-xl border ${
                  touched.email && errors.email
                    ? "border-red-500 bg-red-50/50"
                    : "border-[#d8c7a5] bg-white focus:border-[#1b4332] focus:ring-2 focus:ring-[#1b4332]/20"
                } px-4 py-3 text-sm text-[#1b4332] placeholder-[#a39478] shadow-xs outline-none transition-all`}
              />
              {touched.email && errors.email && (
                <p className="mt-1 text-xs text-red-600 font-medium">{errors.email}</p>
              )}
            </div>

            {/* Contest Name */}
            <div>
              <label htmlFor={competitionId} className="block text-xs font-bold uppercase tracking-wider text-[#1b4332]">
                Contest Name <span className="text-red-500">*</span>
              </label>
              <select
                id={competitionId}
                value={form.competition}
                onChange={(e) => handleChange("competition", e.target.value)}
                onBlur={() => handleBlur("competition")}
                className={`mt-1.5 w-full rounded-xl border ${
                  touched.competition && errors.competition
                    ? "border-red-500 bg-red-50/50"
                    : "border-[#d8c7a5] bg-white focus:border-[#1b4332] focus:ring-2 focus:ring-[#1b4332]/20"
                } px-4 py-3 text-sm text-[#1b4332] shadow-xs outline-none transition-all`}
              >
                <option value="">Select Contest...</option>
                {competitions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {touched.competition && errors.competition && (
                <p className="mt-1 text-xs text-red-600 font-medium">{errors.competition}</p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-[#e6dcc8]">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2.5 text-xs font-semibold text-[#8c591b] hover:text-[#1b4332] transition-colors"
            >
              Reset Form
            </button>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                disabled={!isFormFilled || isVerifying || isPreviewLoading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1b4332] to-[#2d6a4f] px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-[#1b4332]/20 hover:from-[#143326] hover:to-[#23533e] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isVerifying || isPreviewLoading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Verifying Student & Previewing...</span>
                  </>
                ) : (
                  <>
                    <span>🔍 Verify & Show Live Preview</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* PDF Preview & Download Section */}
      {pdfBlobUrl && isVerified && !alreadyDownloaded && (
        <div className="overflow-hidden rounded-3xl border-2 border-[#d8c7a5] bg-[#fffdfa] p-6 shadow-xl sm:p-10 space-y-6">
          <div className="flex flex-col items-start justify-between gap-4 border-b border-[#e6dcc8] pb-6 sm:flex-row sm:items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                <span>✨ Official Verified Preview</span>
              </span>
              <h2 className="mt-2 text-xl font-bold text-[#1b4332] font-serif">
                Certificate for {form.first_name} {form.last_name}
              </h2>
              <p className="text-xs text-[#52796f]">
                Contest: <strong className="text-[#1b4332]">{form.competition}</strong>
              </p>
            </div>

            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloadLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#c28b26] to-[#9a6714] px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-[#c28b26]/30 hover:from-[#ab781f] hover:to-[#84570f] disabled:opacity-50 transition-all"
            >
              {isDownloadLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Processing Download...</span>
                </>
              ) : (
                <>
                  <span>📥 Download Official Certificate (1-Time)</span>
                </>
              )}
            </button>
          </div>

          <PdfPreview url={pdfBlobUrl} />
        </div>
      )}
    </div>
  );
}
