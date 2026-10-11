import { NextRequest, NextResponse } from "next/server";
import { validateStudentInput } from "@/lib/validation";
import { buildCertificatePdf } from "@/lib/pdf";
import { appendToGoogleSheet } from "@/lib/googleSheet";
import { sendCertificateEmail } from "@/lib/mailer";
import { addParticipant } from "@/lib/participationStore";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { first_name, last_name, email, competition, send_email } = body;

    const validation = validateStudentInput({
      first_name,
      last_name,
      email,
      competition,
    });

    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: "Validation failed", errors: validation.errors },
        { status: 422 }
      );
    }

    const { firstName, lastName, email: cleanEmail, competition: cleanComp, fullName } = validation.sanitized;

    // Generate PDF
    const pdfBytes = await buildCertificatePdf(fullName, cleanComp);
    const pdfBuffer = Buffer.from(pdfBytes);

    // Add to participation store if not existing
    addParticipant({
      firstName,
      lastName,
      email: cleanEmail,
      contestName: cleanComp,
      authorized: true,
      downloaded: true,
      downloadedAt: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      emailSent: Boolean(send_email),
    });

    let mailStatus = null;
    if (send_email) {
      mailStatus = await sendCertificateEmail({
        email: cleanEmail,
        firstName,
        lastName,
        competition: cleanComp,
        pdfBuffer,
      });
    }

    // Append to Sheet 1 with authorized status
    appendToGoogleSheet({
      first_name: firstName,
      last_name: lastName,
      email: cleanEmail,
      competition: cleanComp,
      authorized: send_email ? "Yes (Manual + SMTP)" : "Yes (Manual Download)",
      source: "Admin Manual Mode",
    }).catch((err) => {
      console.warn("Sheet sync error:", err.message);
    });

    // Return JSON response if requested as JSON (e.g. for API calls) or return PDF binary if action is download
    if (req.headers.get("accept")?.includes("application/json") || body.return_json) {
      return NextResponse.json({
        success: true,
        message: `Certificate generated for ${fullName}`,
        mailStatus,
        pdfBase64: pdfBuffer.toString("base64"),
      });
    }

    const safeName = `${firstName}_${lastName}_${cleanComp}`
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "_");

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
