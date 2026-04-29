import { getAllLinks, getAllScanCounts, setLink } from "@/lib/kv";
import { validateAuth } from "@/lib/auth";
import { NextResponse } from "next/server";


/**
 * GET /api/links — Fetch all 20 redirect mappings + scan counts
 */
export async function GET(request) {
  if (!validateAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [links, scans] = await Promise.all([getAllLinks(), getAllScanCounts()]);

  return NextResponse.json({ links, scans });
}

/**
 * PUT /api/links — Update a single link
 * Body: { id: number, url: string }
 */
export async function PUT(request) {
  if (!validateAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, url } = body;

    if (!id || id < 1 || id > 20) {
      return NextResponse.json(
        { error: "Invalid QR code ID (must be 1-20)" },
        { status: 400 }
      );
    }

    let processedUrl = url?.trim() || "";

    // Automatically add https:// if protocol is missing
    if (processedUrl !== "" && !/^https?:\/\//i.test(processedUrl)) {
      processedUrl = `https://${processedUrl}`;
    }

    // Basic URL validation
    if (processedUrl !== "") {
      try {
        new URL(processedUrl);
      } catch {
        return NextResponse.json(
          { error: "Invalid URL format" },
          { status: 400 }
        );
      }
    }

    const saved = await setLink(id, processedUrl);
    return NextResponse.json({ id, url: saved });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to update link" },
      { status: 500 }
    );
  }
}
