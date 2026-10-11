"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface PdfPreviewProps {
  url: string;
  onDownload?: () => void;
  downloading?: boolean;
}

export default function PdfPreview({ url, onDownload, downloading }: PdfPreviewProps) {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(1.2);
  const [loading, setLoading] = useState<boolean>(true);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const activeRenderTaskRef = useRef<any>(null);

  const renderPdf = useCallback(async () => {
    if (!url || !canvasContainerRef.current) return;

    // 1. Cancel previous render task if active
    if (activeRenderTaskRef.current) {
      try {
        activeRenderTaskRef.current.cancel();
      } catch {
        // ignore cancellation
      }
      activeRenderTaskRef.current = null;
    }

    setLoading(true);
    setRenderError(null);

    try {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

      const loadingTask = pdfjs.getDocument({ url });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);

      const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
      const baseViewport = page.getViewport({ scale });
      const viewport = page.getViewport({ scale: scale * dpr });

      // Create a fresh canvas element to guarantee no concurrent render conflicts
      const newCanvas = document.createElement("canvas");
      const context = newCanvas.getContext("2d");

      if (!context) {
        throw new Error("Unable to obtain 2D canvas context");
      }

      newCanvas.width = viewport.width;
      newCanvas.height = viewport.height;
      newCanvas.style.width = `${baseViewport.width}px`;
      newCanvas.style.height = `${baseViewport.height}px`;
      newCanvas.className = "mx-auto block rounded-lg shadow-2xl ring-1 ring-black/10";

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
        canvas: newCanvas,
      };

      const renderTask = page.render(renderContext);
      activeRenderTaskRef.current = renderTask;

      await renderTask.promise;
      activeRenderTaskRef.current = null;

      // Safely replace the canvas inside the container
      if (canvasContainerRef.current) {
        canvasContainerRef.current.replaceChildren(newCanvas);
      }
      setLoading(false);
    } catch (err: any) {
      if (err?.name === "RenderingCancelledException") {
        return;
      }
      console.error("PDF preview canvas rendering error:", err);
      setRenderError(err?.message || "Failed to render PDF preview");
      setLoading(false);
    }
  }, [url, scale]);

  useEffect(() => {
    renderPdf();
    return () => {
      if (activeRenderTaskRef.current) {
        try {
          activeRenderTaskRef.current.cancel();
        } catch {
          // ignore
        }
        activeRenderTaskRef.current = null;
      }
    };
  }, [renderPdf]);

  const zoomIn = () => setScale((s) => Math.min(2.0, Number((s + 0.15).toFixed(2))));
  const zoomOut = () => setScale((s) => Math.max(0.6, Number((s - 0.15).toFixed(2))));
  const resetZoom = () => setScale(1.2);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col rounded-3xl border-2 border-[#d8c7a5] bg-[#fffdfa] shadow-xl overflow-hidden transition-all ${
        isFullscreen ? "p-6 overflow-auto max-h-screen" : ""
      }`}
    >
      {/* Top Action Bar with Ayurvedic styling */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8dcbf] bg-[#fbf8f1] px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-2.5 w-2.5 rounded-full bg-[#2d6a4f] animate-pulse" />
          <span className="text-xs font-serif font-bold uppercase tracking-wider text-[#1b4332]">
            प्रमाणपत्र पूर्वावलोकन (Certificate Preview)
          </span>
          <span className="rounded-full border border-[#c28b26]/50 bg-[#fdf5e6] px-2.5 py-0.5 text-[11px] font-bold text-[#8c591b]">
            आधिकारिक प्रारूप
          </span>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={zoomOut}
            title="Zoom Out"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#d8c7a5] bg-white text-sm font-bold text-[#1b4332] hover:bg-[#fbf8f1] transition"
          >
            −
          </button>
          <span className="min-w-12 text-center text-xs font-semibold text-[#52796f]">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={zoomIn}
            title="Zoom In"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#d8c7a5] bg-white text-sm font-bold text-[#1b4332] hover:bg-[#fbf8f1] transition"
          >
            +
          </button>
          <button
            type="button"
            onClick={resetZoom}
            title="Reset Zoom"
            className="rounded-lg border border-[#d8c7a5] bg-white px-2.5 py-1 text-xs font-medium text-[#1b4332] hover:bg-[#fbf8f1] transition"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            title="Toggle Fullscreen"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#d8c7a5] bg-white text-xs font-bold text-[#1b4332] hover:bg-[#fbf8f1] transition"
          >
            {isFullscreen ? "🗗" : "⛶"}
          </button>
        </div>
      </div>

      {/* Canvas Viewport Area */}
      <div className="relative flex min-h-[380px] w-full items-center justify-center overflow-auto bg-[#f6efe3] p-4 sm:p-6">
        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#fffdfa]/80 backdrop-blur-xs">
            <div className="h-10 w-10 animate-spin rounded-full border-3 border-[#1b4332] border-t-transparent" />
            <p className="mt-3 text-sm font-serif font-semibold text-[#1b4332]">
              प्रमाणपत्र लोड हो रहा है... (Rendering certificate preview)
            </p>
          </div>
        )}

        {renderError ? (
          <div className="flex flex-col items-center justify-center p-6 text-center max-w-md">
            <p className="text-sm font-semibold text-red-700">Preview Notice</p>
            <p className="mt-1 text-xs text-slate-600">{renderError}</p>
            <div className="mt-4 w-full">
              <object data={url} type="application/pdf" className="w-full h-80 rounded border">
                <p className="text-xs text-slate-500">
                  Alternative viewer:{" "}
                  <a href={url} target="_blank" rel="noreferrer" className="text-emerald-700 underline font-semibold">
                    Open preview in new tab
                  </a>
                </p>
              </object>
            </div>
          </div>
        ) : (
          <div ref={canvasContainerRef} className="relative transition-transform duration-200 ease-out" />
        )}
      </div>

      {/* Bottom Download Bar */}
      {onDownload && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#e8dcbf] bg-[#fffdfa] p-4">
          <div className="text-xs text-[#52796f] text-center sm:text-left">
            <span className="font-bold text-[#1b4332]">सत्यापन (Verification):</span> Make sure your name spelling and competition are correct before downloading.
          </div>
          <button
            type="button"
            onClick={onDownload}
            disabled={downloading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1b4332] to-[#2d6a4f] px-7 py-3.5 font-serif font-bold text-white shadow-lg shadow-[#1b4332]/25 ring-2 ring-[#c28b26]/50 hover:from-[#132a13] hover:to-[#1b4332] focus:outline-hidden focus:ring-2 focus:ring-[#1b4332] disabled:opacity-50 disabled:cursor-not-allowed transition transform active:scale-98"
          >
            {downloading ? (
              <>
                <svg className="h-4 w-4 animate-spin text-[#d8c7a5]" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>डाउनलोड हो रहा है (Preparing PDF)...</span>
              </>
            ) : (
              <>
                <span className="text-base">📜</span>
                <span>Download Official Certificate (प्रमाणपत्र डाउनलोड करें)</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
