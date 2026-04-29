import Link from "next/link";

export const metadata = {
  title: "Voronoi QR Hub - SimpleRedirect",
  description: "Access the Voronoi PDF patterns via QR codes.",
};

export default function VoronoiHub() {
  const voronoiIds = ["v2", "v3", "v4"];

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="dashboard-title">
          <div className="dashboard-title-icon" style={{ background: 'var(--accent)' }}>🎨</div>
          <div>
            <h1>Voronoi Pattern Hub</h1>
            <p>Access interactive Voronoi PDF viewers via QR codes.</p>
          </div>
        </div>
        <div className="header-actions">
          <Link href="/" className="btn btn-ghost btn-sm">
            ← Back to Admin
          </Link>
        </div>
      </header>

      <div className="qr-grid">
        {voronoiIds.map((id, index) => (
          <div key={id} className="qr-card">
            <div className="qr-card-header">
              <div className="qr-id">
                <span className="qr-badge">Voronoi #{index + 1}</span>
              </div>
            </div>

            <div className="qr-image-container">
              <img
                className="qr-image"
                src={`/api/qr/voronoi/${id}`}
                alt={`Voronoi QR Code ${id}`}
                loading="lazy"
              />
            </div>

            <div className="qr-url-section">
              <div className="qr-url-label">Destination</div>
              <div className="qr-url-display">
                <Link href={`/voronoi/${id}`} target="_blank" rel="noopener noreferrer">
                  /voronoi/{id} ↗
                </Link>
              </div>
            </div>
            
            <div className="qr-card-actions">
              <a
                href={`/api/qr/voronoi/${id}`}
                download={`voronoi-qr-${id}.svg`}
                className="btn btn-ghost btn-sm"
              >
                ⬇ Download SVG
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
