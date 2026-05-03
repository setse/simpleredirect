import { NextResponse } from "next/server";
import { setVoronoiCellData, setVoronoiCellFile, getVoronoiCells, hasVoronoiCellFile } from "@/lib/kv";

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
    const cellAuthor = formData.get("cellAuthor") || "";
    const redirectUrl = formData.get("redirectUrl") || "";

    if (!voronoiId || !cellId) {
      return NextResponse.json({ error: "Missing voronoiId or cellId" }, { status: 400 });
    }

    let publicUrl = null;

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
      publicUrl = `/api/voronoi-pdf/serve/${voronoiId}/${cellId}`;
    } else {
      // If no new file, try to keep existing URL if it exists in metadata AND the file actually exists
      const cells = await getVoronoiCells(voronoiId);
      if (cells[cellId]?.url) {
        const fileExists = await hasVoronoiCellFile(voronoiId, cellId);
        if (fileExists) {
          publicUrl = cells[cellId].url;
        }
      }
    }

    // Save/Update metadata
    await setVoronoiCellData(voronoiId, cellId, { url: publicUrl, name: cellName, author: cellAuthor, redirectUrl });

    return NextResponse.json({ success: true, url: publicUrl, name: cellName, author: cellAuthor, redirectUrl });
  } catch (error) {
    console.error("Voronoi update error:", error);
    return NextResponse.json({ error: "Failed to update cell data" }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const adminPassword = req.headers.get("x-admin-password");
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const voronoiId = searchParams.get("voronoiId");
    const cellId = searchParams.get("cellId");

    if (!voronoiId || !cellId) {
      return NextResponse.json({ error: "Missing voronoiId or cellId" }, { status: 400 });
    }

    await setVoronoiCellData(voronoiId, cellId, null);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Voronoi reset error:", error);
    return NextResponse.json({ error: "Failed to reset cell" }, { status: 500 });
  }
}
