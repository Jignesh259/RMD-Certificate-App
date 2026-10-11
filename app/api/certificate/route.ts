import { NextRequest, NextResponse } from "next/server";
import { validateStudentInput } from "@/lib/validation";
import { buildCertificatePdf } from "@/lib/pdf";
import { appendToGoogleSheet } from "@/lib/googleSheet";
import { verifyStudentEligibility, markStudentDownloaded } from "@/lib/participationStore";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request payload. Please submit valid student details.",
        },
        { status: 400 },
      );
    }

    const validation = validateStudentInput({
      first_name: body.first_name,
      last_name: body.last_name,
      email: body.email,
      competition: body.competition,
    });

    if (!validation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: "Please correct the input errors below.",
          errors: validation.errors,
        },
        { status: 422 },
      );
    }

    const { firstName, lastName, email, competition, fullName } = validation.sanitized;

    // Strict Verification check against Sheet 2 participation database & 1-time download check
    const check = await verifyStudentEligibility(firstName, lastName, email, competition);

    if (!check.verified) {
      return NextResponse.json(
        {
          success: false,
          error: check.message,
        },
        { status: 403 }
      );
    }

    if (check.alreadyDownloaded) {
      return NextResponse.json(
        {
          success: false,
          error: check.message,
        },
        { status: 409 }
      );
    }

    // Extract client IP address for audit record
    const forwarded = req.headers.get("x-forwarded-for");
    const ipAddress = forwarded
      ? forwarded.split(",")[0].trim()
      : req.headers.get("x-real-ip") ?? "127.0.0.1";

    // Mark as downloaded (enforce 1-time download)
    markStudentDownloaded(email);

    // Live update directly into Google Sheet 1 with authorized column
    appendToGoogleSheet({
      first_name: firstName,
      last_name: lastName,
      email,
      competition,
      ip_address: ipAddress,
      authorized: "Yes (Downloaded)",
      source: "Student Portal",
    }).catch((sheetErr) => {
      console.warn("Google Sheet sync warning:", sheetErr?.message);
    });

    // Generate the official PDF
    const pdfBytes = await buildCertificatePdf(fullName, competition);

    // Build clean file name
    const safeName = `${firstName}_${lastName}_${competition}`
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "_");

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err: any) {
    console.error("Certificate download error:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate certificate download. Please try again.",
        details: err?.message,
      },
      { status: 500 },
    );
  }
}
