import { NextResponse } from "next/server";
import { getVoronoiCellFile } from "@/lib/kv";

export async function GET(req, { params }) {
  try {
    const { voronoiId, cellId } = await params;

    const base64 = await getVoronoiCellFile(voronoiId, cellId);

    if (!base64) {
      return new NextResponse("PDF not found", { status: 404 });
    }

    const buffer = Buffer.from(base64, "base64");

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${voronoiId}_cell${cellId}.pdf"`,
        "Cache-Control": "no-store, max-age=0, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Error serving PDF:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
