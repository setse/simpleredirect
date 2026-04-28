import { getLink, incrementScanCount, TOTAL_CODES } from "@/lib/kv";
import { NextResponse } from "next/server";


export async function GET(request, { params }) {
  const { id } = await params;
  const numId = parseInt(id);

  // Validate ID range
  if (isNaN(numId) || numId < 1 || numId > TOTAL_CODES) {
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head><title>Invalid QR Code</title></head>
        <body style="font-family:system-ui;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#0a0a0a;color:#fff;">
          <div style="text-align:center;">
            <h1 style="font-size:3rem;margin-bottom:0.5rem;">⚠️</h1>
            <h2>Invalid QR Code</h2>
            <p style="color:#888;">This QR code ID is not valid.</p>
          </div>
        </body>
      </html>`,
      {
        status: 404,
        headers: { "content-type": "text/html" },
      }
    );
  }

  const destination = await getLink(numId);

  if (!destination) {
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head><title>QR Code #${numId}</title></head>
        <body style="font-family:system-ui;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#0a0a0a;color:#fff;">
          <div style="text-align:center;">
            <h1 style="font-size:3rem;margin-bottom:0.5rem;">📱</h1>
            <h2>QR Code #${numId}</h2>
            <p style="color:#888;">This QR code hasn't been configured yet.</p>
            <p style="color:#555;font-size:0.85rem;">Contact the administrator to set a destination.</p>
          </div>
        </body>
      </html>`,
      {
        status: 200,
        headers: { "content-type": "text/html" },
      }
    );
  }

  // Track the scan
  await incrementScanCount(numId);

  // 302 redirect to destination
  return NextResponse.redirect(destination, 302);
}
