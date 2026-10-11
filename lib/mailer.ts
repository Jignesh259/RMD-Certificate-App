import nodemailer from "nodemailer";

export interface SendCertificateEmailOptions {
  email: string;
  firstName: string;
  lastName: string;
  competition: string;
  pdfBuffer: Buffer;
}

export interface MailResult {
  success: boolean;
  message: string;
  messageId?: string;
  simulated?: boolean;
}

/**
  Creates an SMTP transporter from environment variables.
 */
function createTransporter() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass || user.includes("YOUR_") || pass.includes("YOUR_")) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for other ports
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

/**
 * Sends official certificate email with PDF attachment via SMTP.
 */
export async function sendCertificateEmail(
  options: SendCertificateEmailOptions
): Promise<MailResult> {
  const { email, firstName, lastName, competition, pdfBuffer } = options;
  const fullName = `${firstName} ${lastName}`.trim();
  const transporter = createTransporter();

  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || "certificates@rmd.college.edu";
  const subject = `Official Certificate of Participation - ${competition} | Shree R.M.D. Ayurved College`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #d8c7a5; border-radius: 12px; background-color: #fbf8f1;">
      <div style="text-align: center; padding-bottom: 15px; border-bottom: 2px solid #1b4332;">
        <h2 style="color: #1b4332; margin: 0; font-size: 22px;">🌿 Shree R.M.D. Ayurved College & Hospital</h2>
        <p style="color: #9a6714; margin: 5px 0 0; font-size: 13px; font-weight: bold;">Waghaldhara, Dist. Valsad, Gujarat</p>
        <p style="color: #52796f; margin: 2px 0 0; font-size: 12px;">11th National Ayurveda Day Celebrations</p>
      </div>

      <div style="padding: 20px 0; color: #2d3748;">
        <p style="font-size: 16px;">Respected <strong>${fullName}</strong>,</p>
        
        <p style="font-size: 15px; line-height: 1.6;">
          Congratulations! We take immense pleasure in presenting your official <strong>Certificate of Participation</strong> for the 
          <span style="color: #1b4332; font-weight: bold;">${competition}</span> held during the 11th National Ayurveda Day Celebrations.
        </p>

        <div style="background-color: #fdf5e6; border-left: 4px solid #c28b26; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; color: #8c591b; font-size: 14px; font-style: italic;">
            ॥ स्वस्थस्य स्वास्थ्य रक्षणम् आतुरस्य विकार प्रशमनं च ॥
          </p>
        </div>

        <p style="font-size: 14px; line-height: 1.5; color: #4a5568;">
          Your official certificate is attached to this email as a PDF document. You can save and print it for your academic and official records.
        </p>

        <p style="font-size: 14px; margin-top: 25px;">
          Warm Regards,<br/>
          <strong>Organizing Committee</strong><br/>
          Shree R.M.D. Ayurved College & Hospital<br/>
          <span style="font-size: 12px; color: #718096;">Girivihar Trust Governed</span>
        </p>
      </div>

      <div style="text-align: center; border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 15px; font-size: 11px; color: #a0aec0;">
        This is an automated authorized certificate dispatch from Shree R.M.D. Ayurved College Portal.
      </div>
    </div>
  `;

  if (!transporter) {
    console.warn(`⚠️ [SMTP Notice] SMTP_USER or SMTP_PASS not set in .env. Simulating email send for ${email}`);
    return {
      success: true,
      simulated: true,
      message: `[Simulated] Email dispatch logged for ${email} (SMTP credentials missing in .env)`,
    };
  }

  try {
    const info = await transporter.sendMail({
      from: fromEmail,
      to: email,
      subject,
      html: htmlContent,
      attachments: [
        {
          filename: `Certificate_${firstName}_${lastName}_${competition.replace(/\s+/g, "_")}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    console.log(`✅ [SMTP Success] Certificate email sent to ${email} (Message ID: ${info.messageId})`);
    return {
      success: true,
      simulated: false,
      messageId: info.messageId,
      message: `Email sent successfully to ${email}`,
    };
  } catch (error: any) {
    console.error(`❌ [SMTP Error] Failed to send email to ${email}:`, error.message);
    return {
      success: false,
      simulated: false,
      message: `Failed to send email to ${email}: ${error.message}`,
    };
  }
}
