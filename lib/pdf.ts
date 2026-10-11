import { readFileSync } from "fs";
import path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

/**
 * Builds the official certificate PDF by stamping student name and competition onto the template.
 * Uses verified coordinates and whiteout technique to cleanly replace existing template placeholders.
 */
export async function buildCertificatePdf(
  fullName: string,
  competition: string,
): Promise<Uint8Array> {
  const templatePath = path.join(process.cwd(), "public", "certificate.pdf");
  const templateBytes = readFileSync(templatePath);
  const doc = await PDFDocument.load(templateBytes);
  const page = doc.getPages()[0];

  // 1. Cleanly whiteout existing name placeholder without touching "THIS CERTIFICATE IS PROUDLY PRESENTED TO"
  page.drawRectangle({
    x: 275,
    y: 245,
    width: 490,
    height: 67,
    color: rgb(1, 1, 1),
  });

  // 2. Cleanly whiteout competition line without clipping descenders from the line above
  page.drawRectangle({
    x: 278,
    y: 178,
    width: 485,
    height: 21.5,
    color: rgb(1, 1, 1),
  });

  // Load fonts
  const nameFont = await doc.embedFont(StandardFonts.TimesRomanBoldItalic);
  const compBoldFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const compRegularFont = await doc.embedFont(StandardFonts.Helvetica);

  // Dynamic font sizing for student name to handle names of various lengths
  let nameSize = 42;
  const maxNameWidth = 460;
  while (nameSize > 18 && nameFont.widthOfTextAtSize(fullName, nameSize) > maxNameWidth) {
    nameSize -= 1;
  }

  // Draw student name in elegant certificate gold/bronze: #b58838 -> rgb(0.71, 0.53, 0.22)
  page.drawText(fullName, {
    x: 280.66,
    y: 260,
    size: nameSize,
    font: nameFont,
    color: rgb(0.71, 0.53, 0.22),
  });

  // Draw competition prefix in bold
  const compPrefix = `${competition} Competition `;
  const compPrefixWidth = compBoldFont.widthOfTextAtSize(compPrefix, 12.5);

  page.drawText(compPrefix, {
    x: 280.66,
    y: 184.5,
    size: 12.5,
    font: compBoldFont,
    color: rgb(0.12, 0.12, 0.12),
  });

  // Draw the celebration text in regular weight
  const celebrationSuffix = "11th Ayurveda Day Celebration Held At Shree";
  page.drawText(celebrationSuffix, {
    x: 280.66 + compPrefixWidth,
    y: 184.5,
    size: 12.5,
    font: compRegularFont,
    color: rgb(0.12, 0.12, 0.12),
  });

  return doc.save();
}
