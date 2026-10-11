import { NextRequest, NextResponse } from "next/server";
import { getParticipants, markStudentEmailSent, Participant } from "@/lib/participationStore";
import { buildCertificatePdf } from "@/lib/pdf";
import { sendCertificateEmail } from "@/lib/mailer";
import { appendToGoogleSheet } from "@/lib/googleSheet";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { srNos } = body; // Array of selected srNo numbers to process

    const allParticipants = getParticipants();

    // Filter to selected participants where sendMailChecked is true
    const targets = allParticipants.filter((p) => {
      if (Array.isArray(srNos) && srNos.length > 0) {
        return srNos.includes(p.srNo) && (p.sendMailChecked ?? true);
      }
      return p.sendMailChecked ?? true;
    });

    if (targets.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No students selected for email dispatch (check that 'Send Mail' is checked for the target students).",
        },
        { status: 400 }
      );
    }

    const results = [];
    let successCount = 0;
    let failCount = 0;
    let simulatedCount = 0;

    for (const student of targets) {
      const fullName = `${student.firstName} ${student.lastName}`.trim();
      const competition = student.contestName;

      try {
        // 1. Generate PDF Certificate
        const pdfBytes = await buildCertificatePdf(fullName, competition);
        const pdfBuffer = Buffer.from(pdfBytes);

        // 2. Send via SMTP
        const mailRes = await sendCertificateEmail({
          email: student.email,
          firstName: student.firstName,
          lastName: student.lastName,
          competition,
          pdfBuffer,
        });

        if (mailRes.success) {
          successCount++;
          if (mailRes.simulated) simulatedCount++;

          // 3. Mark as email sent in database/store
          markStudentEmailSent(student.email);

          // 4. Log to Sheet 1 with authorized status
          appendToGoogleSheet({
            first_name: student.firstName,
            last_name: student.lastName,
            email: student.email,
            competition,
            authorized: mailRes.simulated ? "Yes (Simulated SMTP)" : "Yes (SMTP Sent)",
            source: "Admin Bulk SMTP",
          }).catch((err) => {
            console.warn(`Sheet sync failed for ${student.email}:`, err.message);
          });

          results.push({
            srNo: student.srNo,
            email: student.email,
            status: "Success",
            simulated: mailRes.simulated,
            message: mailRes.message,
          });
        } else {
          failCount++;
          results.push({
            srNo: student.srNo,
            email: student.email,
            status: "Failed",
            error: mailRes.message,
          });
        }
      } catch (err: any) {
        failCount++;
        results.push({
          srNo: student.srNo,
          email: student.email,
          status: "Error",
          error: err.message || "Unknown error generating certificate",
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalProcessed: targets.length,
      successCount,
      failCount,
      simulatedCount,
      results,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
