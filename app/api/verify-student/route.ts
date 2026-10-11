import { NextRequest, NextResponse } from "next/server";
import { verifyStudentEligibility } from "@/lib/participationStore";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { first_name, last_name, email, competition } = body;

    if (!email) {
      return NextResponse.json(
        { verified: false, alreadyDownloaded: false, message: "Email is required for verification." },
        { status: 400 }
      );
    }

    const result = await verifyStudentEligibility(
      first_name || "",
      last_name || "",
      email,
      competition || ""
    );

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { verified: false, alreadyDownloaded: false, message: error.message || "Server verification error" },
      { status: 500 }
    );
  }
}
