import { NextRequest, NextResponse } from "next/server";
import {
  getParticipantsAsync,
  setParticipants,
  updateParticipant,
  addParticipant,
  deleteParticipant,
  Participant,
} from "@/lib/participationStore";

export async function GET() {
  const participants = await getParticipantsAsync(true);
  return NextResponse.json({ success: true, count: participants.length, data: participants });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Case A: Replace full list from CSV upload
    if (Array.isArray(body.participants)) {
      const newList: Participant[] = body.participants.map((p: any, idx: number) => ({
        srNo: idx + 1,
        firstName: p.firstName || p.first_name || p["First Name"] || "",
        lastName: p.lastName || p.last_name || p["Last Name"] || "",
        email: (p.email || p.email_id || p["e-mail Id"] || p["Email"] || "").trim().toLowerCase(),
        contestName: p.contestName || p.contest_name || p["Contest Name"] || "REEL MAKING COMPITITION",
        authorized: true,
        downloaded: false,
        emailSent: false,
        sendMailChecked: p.sendMailChecked ?? true,
      }));

      setParticipants(newList);
      return NextResponse.json({
        success: true,
        message: `Imported ${newList.length} participants successfully.`,
        data: newList,
      });
    }

    // Case B: Add single participant manually
    const { firstName, lastName, email, contestName, sendMailChecked } = body;
    if (!email || !firstName) {
      return NextResponse.json(
        { success: false, error: "First Name and Email are required." },
        { status: 400 }
      );
    }

    const created = addParticipant({
      firstName,
      lastName: lastName || "",
      email: email.trim().toLowerCase(),
      contestName: contestName || "REEL MAKING COMPITITION",
      authorized: true,
      downloaded: false,
      emailSent: false,
      sendMailChecked: sendMailChecked ?? true,
    });

    return NextResponse.json({ success: true, message: "Participant added", data: created });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { srNo, ...updates } = body;

    if (!srNo) {
      return NextResponse.json({ success: false, error: "srNo is required for update." }, { status: 400 });
    }

    const updated = updateParticipant(srNo, updates);
    if (!updated) {
      return NextResponse.json({ success: false, error: "Participant not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Updated successfully", data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const srNoStr = searchParams.get("srNo");
    if (!srNoStr) {
      return NextResponse.json({ success: false, error: "srNo parameter required" }, { status: 400 });
    }

    const srNo = parseInt(srNoStr, 10);
    const ok = deleteParticipant(srNo);
    return NextResponse.json({ success: ok, message: ok ? "Deleted" : "Not found" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
