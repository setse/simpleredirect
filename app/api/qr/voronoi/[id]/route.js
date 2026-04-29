import QRCode from "qrcode";
import { NextResponse } from "next/server";
import { headers } from "next/headers";

/**
 * GET /api/qr/voronoi/[id] — Generate QR code SVG for a Voronoi page
 */
export async function GET(request, { params }) {
  const { id } = await params;
  
  if (!id.match(/^v[1-5]$/)) {
    return NextResponse.json({ error: "Invalid Voronoi ID" }, { status: 400 });
  }

  // Build the base URL from the request
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = headersList.get("x-forwarded-proto") || "http";
  const baseUrl = `${protocol}://${host}`;
  const voronoiUrl = `${baseUrl}/voronoi/${id}`;

  // Generate QR code as SVG string
  const svgString = await QRCode.toString(voronoiUrl, {
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
      "content-disposition": `inline; filename="voronoi-qr-${id}.svg"`,
    },
  });
}
