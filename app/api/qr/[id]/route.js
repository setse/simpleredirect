import QRCode from "qrcode";
import { TOTAL_CODES } from "@/lib/kv";
import { NextResponse } from "next/server";
import { headers } from "next/headers";

/**
 * GET /api/qr/[id] — Generate QR code SVG for a given redirect ID
 * The QR code always points to the permanent redirect URL, never the destination.
 */
export async function GET(request, { params }) {
  const { id } = await params;
  const numId = parseInt(id);

  if (isNaN(numId) || numId < 1 || numId > TOTAL_CODES) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  // Build the base URL from the request
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = headersList.get("x-forwarded-proto") || "http";
  const baseUrl = `${protocol}://${host}`;
  const redirectUrl = `${baseUrl}/r/${numId}`;

  // Generate QR code as SVG string
  const svgString = await QRCode.toString(redirectUrl, {
    type: "svg",
    width: 512,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
    errorCorrectionLevel: "H",
  });

  return new NextResponse(svgString, {
    status: 200,
    headers: {
      "content-type": "image/svg+xml",
      "cache-control": "public, max-age=31536000, immutable",
      "content-disposition": `inline; filename="qr-${numId}.svg"`,
    },
  });
}
