"use client";

import { useEffect, useState, useId } from "react";
import dynamic from "next/dynamic";
import Papa from "papaparse";
import { Participant } from "@/lib/participationStore";
import { COMPETITIONS } from "@/lib/competitions";

const PdfPreview = dynamic(() => import("@/components/PdfPreview"), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 w-full items-center justify-center rounded-xl border border-dashed border-[#d8c7a5] bg-[#fffdfa]">
      <div className="flex flex-col items-center gap-2">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1b4332] border-t-transparent" />
        <span className="text-xs text-[#52796f]">Rendering Certificate...</span>
      </div>
    </div>
  ),
});

export default function AdminDashboardPage() {
  const [passcode, setPasscode] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");

  const [activeTab, setActiveTab] = useState<"bulk" | "manual" | "logs">("bulk");

  // Participant list state
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Bulk processing state
  const [isBulkSending, setIsBulkSending] = useState(false);
  const [bulkLog, setBulkLog] = useState<string[]>([]);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });

  // Mode 2 Manual state
  const [manualForm, setManualForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    competition: "REEL MAKING COMPITITION",
    send_email: true,
  });
  const [manualPdfUrl, setManualPdfUrl] = useState<string | null>(null);
  const [manualLoading, setManualLoading] = useState(false);
  const [manualMessage, setManualMessage] = useState<string | null>(null);

  // Preview Modal
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewStudentName, setPreviewStudentName] = useState("");

  // Check url params for auto login (e.g. /admin?key=admin123)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const key = urlParams.get("key");
      if (key === "admin123" || key === "admin") {
        setIsAuthenticated(true);
      }
    }
    fetchParticipants();
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === "admin123" || passcode === "admin" || passcode === "rmd2026") {
      setIsAuthenticated(true);
      setAuthError("");
    } else {
      setAuthError("Invalid Admin Passcode. Default is 'admin123'.");
    }
  };

  const fetchParticipants = async () => {
    setLoadingList(true);
    try {
      const res = await fetch("/api/admin/participation");
      if (res.ok) {
        const json = await res.json();
        if (json.data) setParticipants(json.data);
      }
    } catch (err) {
      console.warn("Failed to fetch participants:", err);
    } finally {
      setLoadingList(false);
    }
  };

  // CSV Import handler
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const res = await fetch("/api/admin/participation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ participants: results.data }),
          });

          const json = await res.json();
          if (json.success) {
            setParticipants(json.data);
            alert(`✅ CSV Imported: Loaded ${json.data.length} student records into preview table.`);
          } else {
            alert(`Error importing CSV: ${json.error}`);
          }
        } catch (err: any) {
          alert(`CSV Parse Error: ${err.message}`);
        }
      },
    });
  };

  // Toggle checklist for individual row
  const toggleRowCheck = (srNo: number) => {
    setParticipants((prev) =>
      prev.map((p) => (p.srNo === srNo ? { ...p, sendMailChecked: !p.sendMailChecked } : p))
    );
  };

  // Toggle select all
  const toggleSelectAll = (checked: boolean) => {
    setParticipants((prev) => prev.map((p) => ({ ...p, sendMailChecked: checked })));
  };

  // Inline edit row details
  const updateRowDetail = (srNo: number, field: keyof Participant, val: any) => {
    setParticipants((prev) =>
      prev.map((p) => (p.srNo === srNo ? { ...p, [field]: val } : p))
    );
  };

  // Save single row to backend API
  const saveRowDetail = async (student: Participant) => {
    try {
      const res = await fetch("/api/admin/participation", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(student),
      });
      if (res.ok) {
        alert(`Saved details for ${student.firstName} ${student.lastName}`);
      }
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    }
  };

  // Delete row
  const deleteRow = async (srNo: number) => {
    if (!confirm("Are you sure you want to delete this participant row?")) return;
    try {
      await fetch(`/api/admin/participation?srNo=${srNo}`, { method: "DELETE" });
      setParticipants((prev) => prev.filter((p) => p.srNo !== srNo));
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  // Preview individual row PDF
  const previewRowPdf = async (student: Participant) => {
    setPreviewStudentName(`${student.firstName} ${student.lastName}`);
    setPreviewPdfUrl(null);

    try {
      const res = await fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: student.firstName,
          last_name: student.lastName,
          email: student.email,
          competition: student.contestName,
        }),
      });

      if (res.ok) {
        const blob = await res.blob();
        setPreviewPdfUrl(URL.createObjectURL(blob));
      } else {
        alert("Failed to render preview PDF for student.");
      }
    } catch (err: any) {
      alert(`Preview Error: ${err.message}`);
    }
  };

  // Bulk SMTP Dispatcher
  const handleBulkSmtpSend = async () => {
    const selected = participants.filter((p) => p.sendMailChecked ?? true);
    if (selected.length === 0) {
      alert("No students checked in the list! Please check the students you wish to send emails to.");
      return;
    }

    if (!confirm(`Are you ready to send PDF certificates via SMTP to ${selected.length} checked students?`)) {
      return;
    }

    setIsBulkSending(true);
    setBulkLog([`🚀 Initializing Bulk SMTP Dispatch for ${selected.length} students...`]);
    setBulkProgress({ current: 0, total: selected.length });

    try {
      const selectedSrNos = selected.map((p) => p.srNo);

      const res = await fetch("/api/admin/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ srNos: selectedSrNos }),
      });

      const json = await res.json();
      if (json.success) {
        setBulkProgress({ current: json.totalProcessed, total: json.totalProcessed });
        const logLines = json.results.map(
          (r: any) =>
            `${r.status === "Success" ? "✅" : "❌"} [Sr.${r.srNo}] ${r.email}: ${
              r.status === "Success" ? (r.simulated ? "Simulated Send (SMTP credentials missing)" : "Sent via SMTP") : r.error
            }`
        );
        setBulkLog((prev) => [
          ...prev,
          `🏁 Dispatch Finished: ${json.successCount} sent successfully, ${json.failCount} failed.`,
          ...logLines,
        ]);
        fetchParticipants();
      } else {
        setBulkLog((prev) => [...prev, `❌ Error: ${json.error}`]);
      }
    } catch (err: any) {
      setBulkLog((prev) => [...prev, `❌ Exception during dispatch: ${err.message}`]);
    } finally {
      setIsBulkSending(false);
    }
  };

  // Mode 2 Manual Preview / Submit
  const handleManualPreview = async () => {
    if (!manualForm.first_name || !manualForm.email) {
      alert("First Name and Email are required for manual generation.");
      return;
    }

    setManualLoading(true);
    setManualMessage(null);

    try {
      const res = await fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: manualForm.first_name,
          last_name: manualForm.last_name,
          email: manualForm.email,
          competition: manualForm.competition,
        }),
      });

      if (res.ok) {
        const blob = await res.blob();
        setManualPdfUrl(URL.createObjectURL(blob));
        setManualMessage("Preview ready! Check below.");
      } else {
        alert("Error generating preview PDF.");
      }
    } catch (err: any) {
      alert(`Manual Error: ${err.message}`);
    } finally {
      setManualLoading(false);
    }
  };

  const handleManualDownloadAndSend = async () => {
    if (!manualForm.first_name || !manualForm.email) {
      alert("First Name and Email are required.");
      return;
    }

    setManualLoading(true);
    setManualMessage(null);

    try {
      const res = await fetch("/api/admin/generate-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(manualForm),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Certificate_${manualForm.first_name}_${manualForm.last_name}_${manualForm.competition}.pdf`.replace(/\s+/g, "_");
        a.click();
        URL.revokeObjectURL(url);
        setManualMessage("🎉 Certificate downloaded 1-by-1! Stored details in Sheet 1 with Authorized status.");
        fetchParticipants();
      } else {
        alert("Error generating certificate.");
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setManualLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-3xl border-2 border-[#d8c7a5] bg-[#fffdfa] p-8 shadow-2xl">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1b4332] text-2xl text-white shadow-lg">
              🔐
            </div>
            <h1 className="mt-4 text-2xl font-bold text-[#1b4332] font-serif">Admin Portal Authentication</h1>
            <p className="mt-1 text-xs text-[#52796f]">Shree R.M.D. Ayurved College & Hospital</p>
          </div>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-[#1b4332]">Admin Passcode</label>
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter passcode (default: admin123)"
                className="mt-1.5 w-full rounded-xl border border-[#d8c7a5] px-4 py-3 text-sm text-[#1b4332] focus:border-[#1b4332] focus:ring-2 focus:ring-[#1b4332]/20 outline-none"
              />
            </div>

            {authError && <p className="text-xs text-red-600 font-semibold">{authError}</p>}

            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-[#1b4332] to-[#2d6a4f] py-3.5 text-sm font-bold text-white shadow-md hover:from-[#143326] hover:to-[#23533e] transition-all"
            >
              Access Admin Panel
            </button>
          </form>

          <div className="mt-4 text-center">
            <span className="text-[11px] text-[#718096]">Tip: You can also append <code className="bg-[#f0e6d2] px-1 rounded">?key=admin123</code> to the URL.</span>
          </div>
        </div>
      </div>
    );
  }

  const filteredParticipants = participants.filter((p) => {
    const q = searchTerm.toLowerCase();
    return (
      p.firstName.toLowerCase().includes(q) ||
      p.lastName.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.contestName.toLowerCase().includes(q)
    );
  });

  const selectedCount = participants.filter((p) => p.sendMailChecked ?? true).length;
  const totalCount = participants.length;
  const sentCount = participants.filter((p) => p.emailSent).length;
  const downloadedCount = participants.filter((p) => p.downloaded).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8">
      {/* Top Header Banner */}
      <div className="flex flex-col gap-4 rounded-3xl border-2 border-[#d8c7a5] bg-gradient-to-r from-[#1b4332] via-[#2d6a4f] to-[#1b4332] p-6 text-white shadow-xl sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#c28b26]/30 px-3 py-1 text-xs font-semibold text-[#fbf8f1]">
            <span>⚙️ College Administrative Control</span>
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight font-serif sm:text-3xl text-[#fffdfa]">
            Certificate Management & SMTP Dispatcher
          </h1>
          <p className="mt-1 text-xs text-[#b7e4c7]">
            Sheet 1 Storage Sync & Sheet 2 Participant Verification Portal
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchParticipants}
            className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/20 transition-all"
          >
            🔄 Refresh Data
          </button>
          <button
            onClick={() => setIsAuthenticated(false)}
            className="rounded-xl border border-red-400/30 bg-red-500/20 px-4 py-2 text-xs font-bold text-red-100 hover:bg-red-500/30 transition-all"
          >
            🔒 Lock Admin
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-[#d8c7a5] gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab("bulk")}
          className={`flex items-center gap-2 px-5 py-3 font-bold text-sm rounded-t-2xl transition-all border-t-2 border-x-2 ${
            activeTab === "bulk"
              ? "border-[#d8c7a5] bg-[#fffdfa] text-[#1b4332]"
              : "border-transparent text-[#64748b] hover:text-[#1b4332]"
          }`}
        >
          <span>📁 Mode 1: CSV Bulk Batch & SMTP Mailer</span>
          <span className="rounded-full bg-[#1b4332] px-2 py-0.5 text-[10px] text-white">{totalCount}</span>
        </button>

        <button
          onClick={() => setActiveTab("manual")}
          className={`flex items-center gap-2 px-5 py-3 font-bold text-sm rounded-t-2xl transition-all border-t-2 border-x-2 ${
            activeTab === "manual"
              ? "border-[#d8c7a5] bg-[#fffdfa] text-[#1b4332]"
              : "border-transparent text-[#64748b] hover:text-[#1b4332]"
          }`}
        >
          <span>✍️ Mode 2: Manual Certificate Download</span>
        </button>

        <button
          onClick={() => setActiveTab("logs")}
          className={`flex items-center gap-2 px-5 py-3 font-bold text-sm rounded-t-2xl transition-all border-t-2 border-x-2 ${
            activeTab === "logs"
              ? "border-[#d8c7a5] bg-[#fffdfa] text-[#1b4332]"
              : "border-transparent text-[#64748b] hover:text-[#1b4332]"
          }`}
        >
          <span>📊 System Stats & Sheet 1 Status</span>
        </button>
      </div>

      {/* TAB 1: CSV BULK & SMTP MAILER */}
      {activeTab === "bulk" && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col gap-4 rounded-2xl border border-[#d8c7a5] bg-[#fffdfa] p-4 sm:flex-row sm:items-center sm:justify-between shadow-xs">
            {/* CSV Import */}
            <div className="flex flex-wrap items-center gap-3">
              <label className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-[#1b4332] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#143326] transition-all">
                <span>📤 Import CSV File</span>
                <input type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />
              </label>

              <button
                onClick={fetchParticipants}
                className="rounded-xl border border-[#c28b26] bg-[#fdf5e6] px-4 py-2.5 text-xs font-bold text-[#8c591b] hover:bg-[#fcecd2] transition-all"
              >
                📋 Load Sheet 2 Seed Data (21 Students)
              </button>
            </div>

            {/* Search Input */}
            <div className="w-full sm:w-64">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search participant..."
                className="w-full rounded-xl border border-[#d8c7a5] px-3.5 py-2 text-xs text-[#1b4332] focus:border-[#1b4332] outline-none"
              />
            </div>
          </div>

          {/* Action Bar for SMTP Sending */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-[#c28b26]/50 bg-[#fdf5e6] p-4 text-[#8c591b] shadow-xs">
            <div>
              <span className="font-bold text-sm">Checklist Mail Selection:</span>
              <p className="text-xs text-[#8c591b]/80">
                <strong>{selectedCount}</strong> of <strong>{totalCount}</strong> participants checked for email dispatch. If unchecked, email will NOT be sent for that student ID.
              </p>
            </div>

            <button
              onClick={handleBulkSmtpSend}
              disabled={isBulkSending || selectedCount === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#c28b26] to-[#9a6714] px-6 py-3 text-sm font-bold text-white shadow-md hover:from-[#ab781f] hover:to-[#84570f] disabled:opacity-50 transition-all"
            >
              {isBulkSending ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Processing SMTP Emails...</span>
                </>
              ) : (
                <>
                  <span>🚀 Send Certificates via SMTP Email ({selectedCount})</span>
                </>
              )}
            </button>
          </div>

          {/* Live Bulk Execution Progress & Log Box */}
          {bulkLog.length > 0 && (
            <div className="rounded-2xl border border-gray-800 bg-gray-950 p-4 text-xs font-mono text-emerald-400 space-y-2 shadow-lg">
              <div className="flex items-center justify-between border-b border-gray-800 pb-2 text-gray-400">
                <span>SMTP Execution Log</span>
                <span>
                  Progress: {bulkProgress.current} / {bulkProgress.total}
                </span>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {bulkLog.map((log, i) => (
                  <div key={i}>{log}</div>
                ))}
              </div>
            </div>
          )}

          {/* Interactive Editable Preview Table */}
          <div className="overflow-x-auto rounded-2xl border border-[#d8c7a5] bg-[#fffdfa] shadow-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#1b4332] text-[#fffdfa] font-bold">
                <tr>
                  <th className="p-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedCount === totalCount && totalCount > 0}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                      className="h-4 w-4 rounded accent-[#c28b26] cursor-pointer"
                      title="Select / Unselect All for Email Dispatch"
                    />
                  </th>
                  <th className="p-3">Sr. No</th>
                  <th className="p-3">First Name</th>
                  <th className="p-3">Last Name</th>
                  <th className="p-3">Email ID (Registered)</th>
                  <th className="p-3">Contest Name</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e6dcc8]">
                {filteredParticipants.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-500">
                      No participants found. Click "Load Sheet 2 Seed Data" or upload a CSV file.
                    </td>
                  </tr>
                ) : (
                  filteredParticipants.map((p) => (
                    <tr key={p.srNo} className={`hover:bg-[#fbf8f1] transition-colors ${!p.sendMailChecked ? "bg-gray-50 opacity-75" : ""}`}>
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={p.sendMailChecked ?? true}
                          onChange={() => toggleRowCheck(p.srNo)}
                          className="h-4 w-4 rounded accent-[#c28b26] cursor-pointer"
                          title="Check to send email, uncheck to skip"
                        />
                      </td>
                      <td className="p-3 font-semibold text-[#1b4332]">{p.srNo}</td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={p.firstName}
                          onChange={(e) => updateRowDetail(p.srNo, "firstName", e.target.value)}
                          className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-[#1b4332] outline-none"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={p.lastName}
                          onChange={(e) => updateRowDetail(p.srNo, "lastName", e.target.value)}
                          className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-[#1b4332] outline-none"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="email"
                          value={p.email}
                          onChange={(e) => updateRowDetail(p.srNo, "email", e.target.value)}
                          className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-[#1b4332] outline-none font-mono"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={p.contestName}
                          onChange={(e) => updateRowDetail(p.srNo, "contestName", e.target.value)}
                          className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-[#1b4332] outline-none"
                        />
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {p.emailSent ? (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                              ✉️ Email Sent
                            </span>
                          ) : (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                              ⏳ Pending Email
                            </span>
                          )}
                          {p.downloaded && (
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                              📥 Downloaded
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => previewRowPdf(p)}
                            className="rounded-md border border-[#1b4332] bg-[#1b4332]/10 px-2 py-1 text-[11px] font-bold text-[#1b4332] hover:bg-[#1b4332] hover:text-white transition-all"
                            title="Preview PDF Certificate"
                          >
                            👁️ Preview
                          </button>
                          <button
                            onClick={() => saveRowDetail(p)}
                            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-[11px] font-bold text-gray-700 hover:bg-gray-100 transition-all"
                            title="Save Row Changes"
                          >
                            💾 Save
                          </button>
                          <button
                            onClick={() => deleteRow(p.srNo)}
                            className="rounded-md border border-red-300 bg-red-50 px-2 py-1 text-[11px] font-bold text-red-600 hover:bg-red-600 hover:text-white transition-all"
                            title="Delete Row"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: MANUAL CERTIFICATE GENERATION */}
      {activeTab === "manual" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="rounded-3xl border-2 border-[#d8c7a5] bg-[#fffdfa] p-6 shadow-xl space-y-6">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1b4332]/10 px-3 py-1 text-xs font-bold text-[#1b4332]">
                ✍️ Mode 2: Manual Certificate Creator
              </span>
              <h2 className="mt-2 text-xl font-bold text-[#1b4332] font-serif">Type Student Details</h2>
              <p className="text-xs text-[#52796f]">
                Generate, download one-by-one, and optionally dispatch email via SMTP.
              </p>
            </div>

            {manualMessage && (
              <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-semibold text-emerald-900">
                {manualMessage}
              </div>
            )}

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#1b4332] uppercase">First Name *</label>
                <input
                  type="text"
                  value={manualForm.first_name}
                  onChange={(e) => setManualForm({ ...manualForm, first_name: e.target.value })}
                  placeholder="e.g. Rahul"
                  className="mt-1 w-full rounded-xl border border-[#d8c7a5] px-3.5 py-2.5 text-sm text-[#1b4332] focus:border-[#1b4332] outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1b4332] uppercase">Last Name *</label>
                <input
                  type="text"
                  value={manualForm.last_name}
                  onChange={(e) => setManualForm({ ...manualForm, last_name: e.target.value })}
                  placeholder="e.g. Patel"
                  className="mt-1 w-full rounded-xl border border-[#d8c7a5] px-3.5 py-2.5 text-sm text-[#1b4332] focus:border-[#1b4332] outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1b4332] uppercase">Email ID *</label>
                <input
                  type="email"
                  value={manualForm.email}
                  onChange={(e) => setManualForm({ ...manualForm, email: e.target.value })}
                  placeholder="e.g. rahul.patel@rmd.college.edu"
                  className="mt-1 w-full rounded-xl border border-[#d8c7a5] px-3.5 py-2.5 text-sm text-[#1b4332] focus:border-[#1b4332] outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1b4332] uppercase">Contest Name *</label>
                <select
                  value={manualForm.competition}
                  onChange={(e) => setManualForm({ ...manualForm, competition: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-[#d8c7a5] px-3.5 py-2.5 text-sm text-[#1b4332] focus:border-[#1b4332] outline-none"
                >
                  <option value="REEL MAKING COMPITITION">REEL MAKING COMPITITION</option>
                  {COMPETITIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="manualSendEmail"
                  checked={manualForm.send_email}
                  onChange={(e) => setManualForm({ ...manualForm, send_email: e.target.checked })}
                  className="h-4 w-4 rounded accent-[#c28b26] cursor-pointer"
                />
                <label htmlFor="manualSendEmail" className="font-bold text-[#1b4332] cursor-pointer">
                  Send email copy via SMTP with PDF attachment
                </label>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-[#e6dcc8]">
              <button
                type="button"
                onClick={handleManualPreview}
                disabled={manualLoading}
                className="w-full sm:w-auto rounded-xl border-2 border-[#1b4332] bg-white px-5 py-3 text-xs font-bold text-[#1b4332] hover:bg-[#1b4332] hover:text-white transition-all"
              >
                👁️ Preview PDF
              </button>
              <button
                type="button"
                onClick={handleManualDownloadAndSend}
                disabled={manualLoading}
                className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-[#1b4332] to-[#2d6a4f] px-6 py-3 text-xs font-bold text-white shadow-md hover:from-[#143326] transition-all"
              >
                📥 Download & Save Record (Sheet 1)
              </button>
            </div>
          </div>

          {/* Manual PDF Preview Box */}
          <div className="rounded-3xl border-2 border-[#d8c7a5] bg-[#fffdfa] p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-sm text-[#1b4332]">Manual Live Certificate Preview</h3>
            {manualPdfUrl ? (
              <PdfPreview url={manualPdfUrl} />
            ) : (
              <div className="flex h-80 w-full items-center justify-center rounded-2xl border border-dashed border-[#d8c7a5] bg-[#fbf8f1] text-xs text-[#52796f]">
                Fill details and click "Preview PDF" to visualize here.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: SYSTEM AUDIT & SHEET 1 LOGS */}
      {activeTab === "logs" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-[#d8c7a5] bg-[#fffdfa] p-5 shadow-xs">
              <span className="text-xs text-[#52796f] font-bold">Total Registered</span>
              <div className="mt-1 text-2xl font-extrabold text-[#1b4332]">{totalCount}</div>
              <span className="text-[10px] text-gray-500">Sheet 2 Participants</span>
            </div>

            <div className="rounded-2xl border border-[#d8c7a5] bg-[#fffdfa] p-5 shadow-xs">
              <span className="text-xs text-[#52796f] font-bold font-serif">Selected for Mail</span>
              <div className="mt-1 text-2xl font-extrabold text-[#c28b26]">{selectedCount}</div>
              <span className="text-[10px] text-gray-500">Checklist Enabled</span>
            </div>

            <div className="rounded-2xl border border-[#d8c7a5] bg-[#fffdfa] p-5 shadow-xs">
              <span className="text-xs text-[#52796f] font-bold">Emails Dispatched</span>
              <div className="mt-1 text-2xl font-extrabold text-emerald-700">{sentCount}</div>
              <span className="text-[10px] text-gray-500">Via SMTP Server</span>
            </div>

            <div className="rounded-2xl border border-[#d8c7a5] bg-[#fffdfa] p-5 shadow-xs">
              <span className="text-xs text-[#52796f] font-bold">Student Downloads</span>
              <div className="mt-1 text-2xl font-extrabold text-blue-700">{downloadedCount}</div>
              <span className="text-[10px] text-gray-500">1-Time Completed</span>
            </div>
          </div>

          <div className="rounded-3xl border-2 border-[#d8c7a5] bg-[#fffdfa] p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-base text-[#1b4332] font-serif">Google Sheet 1 Webhook Status & Setup Guide</h3>
            <p className="text-xs text-[#52796f] leading-relaxed">
              Every certificate issued (either via Student 1-Time Download, Admin Bulk SMTP Dispatch, or Admin Manual Generation) sends a real-time payload to <strong>Sheet 1</strong> with the new <strong>Authorized</strong> column.
            </p>

            <div className="rounded-2xl bg-[#fdf5e6] border border-[#c28b26]/40 p-4 text-xs text-[#8c591b] space-y-2">
              <span className="font-bold text-sm">Sheet 1 Column Structure required:</span>
              <div className="grid grid-cols-2 sm:grid-cols-7 gap-2 font-mono text-[11px] text-[#1b4332]">
                <div className="bg-white p-2 rounded border border-[#d8c7a5]">A: Timestamp</div>
                <div className="bg-white p-2 rounded border border-[#d8c7a5]">B: First Name</div>
                <div className="bg-white p-2 rounded border border-[#d8c7a5]">C: Last Name</div>
                <div className="bg-white p-2 rounded border border-[#d8c7a5]">D: Email</div>
                <div className="bg-white p-2 rounded border border-[#d8c7a5]">E: Competition</div>
                <div className="bg-white p-2 rounded border border-[#d8c7a5]">F: IP Address</div>
                <div className="bg-white p-2 rounded border border-[#d8c7a5]">G: Authorized</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF Single Preview Modal */}
      {previewPdfUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-4xl rounded-3xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-[#1b4332]">Preview PDF: {previewStudentName}</h3>
              <button
                onClick={() => setPreviewPdfUrl(null)}
                className="rounded-full bg-gray-100 p-2 text-xs font-bold text-gray-700 hover:bg-gray-200"
              >
                ✕ Close
              </button>
            </div>
            <PdfPreview url={previewPdfUrl} />
          </div>
        </div>
      )}
    </div>
  );
}
