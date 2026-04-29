import { NextResponse } from "next/server";
import { setVoronoiCellData, setVoronoiCellFile, getVoronoiCells } from "@/lib/kv";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const voronoiId = searchParams.get("voronoiId");

    if (!voronoiId) {
      return NextResponse.json({ error: "Missing voronoiId" }, { status: 400 });
    }

    const cells = await getVoronoiCells(voronoiId);
    return NextResponse.json({ cells });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch cells" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    // Basic auth check
    const adminPassword = req.headers.get("x-admin-password");
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const voronoiId = formData.get("voronoiId");
    const cellId = formData.get("cellId");
    const cellName = formData.get("cellName") || `Cell ${cellId}`;

    if (!voronoiId || !cellId) {
      return NextResponse.json({ error: "Missing voronoiId or cellId" }, { status: 400 });
    }

    let publicUrl = `/api/voronoi-pdf/serve/${voronoiId}/${cellId}`;

    if (file && file.size > 0) {
      if (file.type !== "application/pdf") {
        return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 });
      }

      // Convert file to Base64 for Upstash Redis storage
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString("base64");

      // Save raw file data to Upstash
      await setVoronoiCellFile(voronoiId, cellId, base64);
    } else {
      // If no new file, try to keep existing URL if it exists in metadata
      const cells = await getVoronoiCells(voronoiId);
      if (cells[cellId]?.url) {
        publicUrl = cells[cellId].url;
      }
    }

    // Save/Update metadata
    await setVoronoiCellData(voronoiId, cellId, { url: publicUrl, name: cellName });

    return NextResponse.json({ success: true, url: publicUrl, name: cellName });
  } catch (error) {
    console.error("Voronoi update error:", error);
    return NextResponse.json({ error: "Failed to update cell data" }, { status: 500 });
  }
}
