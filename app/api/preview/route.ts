import { NextRequest, NextResponse } from "next/server";
import { validateStudentInput } from "@/lib/validation";
import { buildCertificatePdf } from "@/lib/pdf";

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

    const { fullName, competition } = validation.sanitized;
    const pdfBytes = await buildCertificatePdf(fullName, competition);

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="certificate_preview.pdf"',
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err: any) {
    console.error("Preview generation error:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate certificate preview. Please try again.",
        details: err?.message,
      },
      { status: 500 },
    );
  }
}
