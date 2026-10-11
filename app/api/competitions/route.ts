import { NextResponse } from "next/server";
import { COMPETITIONS } from "@/lib/competitions";

export async function GET() {
  return NextResponse.json({
    success: true,
    competitions: COMPETITIONS,
  });
}
