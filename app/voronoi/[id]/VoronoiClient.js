"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

// Dynamically import PdfViewer to avoid SSR issues with react-pdf
const PdfViewer = dynamic(() => import("@/components/PdfViewer"), { ssr: false });

export default function VoronoiClient({ id, cells }) {
  const [activePdf, setActivePdf] = useState(null); // Stores { url, name }
  const [hoveredCell, setHoveredCell] = useState(null);
  const [svgContent, setSvgContent] = useState(null);
  const [loadingSvg, setLoadingSvg] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [labels, setLabels] = useState([]);
  const [viewBox, setViewBox] = useState("0 0 100 100");
  const containerRef = useRef(null);

  // Disable pinch-to-zoom on mobile
  useEffect(() => {
    const handleTouch = (e) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };
    
    const handleGesture = (e) => {
      e.preventDefault();
    };

    document.addEventListener("touchstart", handleTouch, { passive: false });
    document.addEventListener("gesturestart", handleGesture, { passive: false });
    
    return () => {
      document.removeEventListener("touchstart", handleTouch);
      document.removeEventListener("gesturestart", handleGesture);
    };
  }, []);

  const SPECIAL_CELLS = {
    v2: [4],
    v3: [2],
    v4: [2]
  };

  const isSpecial = (cellId) => {
    const specialList = SPECIAL_CELLS[id] || [];
    return specialList.includes(parseInt(cellId));
  };

  // Load external SVG if it exists
  useEffect(() => {
    setLoadingSvg(true);
    fetch(`/voronoi/${id}.svg`)
      .then((res) => {
        if (!res.ok) throw new Error("External SVG not found");
        return res.text();
      })
      .then((text) => setSvgContent(text))
      .catch(() => setSvgContent(null)) // Fallback to internal placeholder
      .finally(() => setLoadingSvg(false));
  }, [id]);

  // Compute stable labels when SVG or cells change
  useEffect(() => {
    const timer = setTimeout(() => {
      const svg = containerRef.current?.querySelector("svg");
      if (!svg) return;

      const vb = svg.viewBox.baseVal;
      if (vb.width > 0) {
        setViewBox(`${vb.x} ${vb.y} ${vb.width} ${vb.height}`);
      }

      const newLabels = [];
      const baseFontSize = vb.width ? vb.width / 24 : 3; // Smaller labels as requested

      for (let i = 1; i <= 20; i++) {
        const cell = svg.querySelector(`#cell-${i}, [data-cell="${i}"]`);
        if (cell && cells[i]?.name) {
          const bbox = cell.getBBox();
          const name = cells[i].name;

          // Multi-line wrapping logic
          const words = name.split(/\s+/);
          const lines = [];
          let currentLine = "";
          const maxLineChars = 7; // More aggressive wrapping for narrow cells

          words.forEach(word => {
            if ((currentLine + " " + word).trim().length <= maxLineChars) {
              currentLine += (currentLine ? " " : "") + word;
            } else {
              if (currentLine) lines.push(currentLine);
              currentLine = word;
            }
          });
          if (currentLine) lines.push(currentLine);

          newLabels.push({
            id: i,
            x: bbox.x + bbox.width / 2,
            y: bbox.y + bbox.height / 2,
            lines: lines,
            fontSize: baseFontSize
          });
        }
      }
      setLabels(newLabels);
    }, 800);
    return () => clearTimeout(timer);
  }, [svgContent, cells]);

  const handleCellClick = (cellId) => {
    const cellData = cells[cellId] || { name: `Cell ${cellId}`, url: null };

    if (isSpecial(cellId)) return; // Disable clicking for special cells

    if (cellData.url) {
      setActivePdf(cellData);
    } else if (cellData.redirectUrl) {
      window.open(cellData.redirectUrl, "_blank");
    } else {
      // Show smiley view for unconfigured cells
      setActivePdf(cellData);

      if (editMode) {
        const confirmEdit = confirm(`${cellData.name} is not configured. Would you like to configure it now?`);
        if (confirmEdit) {
          window.location.href = `/?tab=voronoi&v=${id}&c=${cellId}`;
        }
      }
    }
  };

  const configuredCount = Object.values(cells).filter(c => c?.url).length;
  // Count available cells in SVG
  const [totalCells, setTotalCells] = useState(5);

  useEffect(() => {
    const svg = containerRef.current?.querySelector("svg");
    if (svg) {
      const count = svg.querySelectorAll("[id^='cell-'], [data-cell]").length;
      if (count > 0) setTotalCells(count);
    }
  }, [svgContent]);

  // Internal Fallback Paths (keeping same as before)
  const svgCells = [
    { cellId: 1, path: "M 0,0 L 40,0 L 50,40 L 0,60 Z", color: "rgba(255, 255, 255, 0.05)" },
    { cellId: 2, path: "M 40,0 L 100,0 L 100,50 L 70,60 L 50,40 Z", color: "rgba(255, 255, 255, 0.05)" },
    { cellId: 3, path: "M 0,60 L 50,40 L 40,100 L 0,100 Z", color: "rgba(255, 255, 255, 0.05)" },
    { cellId: 4, path: "M 50,40 L 70,60 L 80,100 L 40,100 Z", color: "rgba(255, 255, 255, 0.05)" },
    { cellId: 5, path: "M 70,60 L 100,50 L 100,100 L 80,100 Z", color: "rgba(255, 255, 255, 0.05)" },
  ];

  const onSvgHover = (e, isEnter) => {
    const target = e.target.closest("[id^='cell-'], [data-cell]");
    if (target) {
      const cellId = target.id?.replace("cell-", "") || target.getAttribute("data-cell");
      setHoveredCell(isEnter ? cellId : null);
    }
  };

  const PATTERN_TITLES = {
    v2: "Interlocking Building Systems",
    v3: "Tension / Force-Based Systems",
    v4: "Mechanical Locking / Unlocking Systems"
  };

  return (
    <div className="voronoi-container">
      <header className="voronoi-header">
        <h1><span>{PATTERN_TITLES[id] || id.toUpperCase()}</span></h1>
        <div className="voronoi-controls mt-4">
          <div className="pattern-switcher" style={{ display: "flex", gap: "1.5rem", justifyContent: "center", alignItems: "center", marginBottom: "1rem" }}>
            <Link
              href="/voronoi/v2"
              className={`shape-btn left-half ${id === 'v2' ? 'active' : ''}`}
              title="Interlocking"
            />
            <Link
              href="/voronoi/v3"
              className={`shape-btn full-circle ${id === 'v3' ? 'active' : ''}`}
              title="Tension"
            />
            <Link
              href="/voronoi/v4"
              className={`shape-btn right-half ${id === 'v4' ? 'active' : ''}`}
              title="Mechanical"
            />
          </div>
        </div>
      </header>

      <div className="voronoi-svg-wrapper" ref={containerRef}>
        <div className="cell-info-container">
          {hoveredCell && !isSpecial(hoveredCell) && cells[hoveredCell]?.name ? (
            <div className="cell-name">{cells[hoveredCell].name}</div>
          ) : (hoveredCell && !isSpecial(hoveredCell)) ? (
            <div className="cell-name empty">Unconfigured Cell {hoveredCell}</div>
          ) : (
            <div className="cell-hint">Select a cell to view document</div>
          )}
        </div>

        <div className={`voronoi-map-stack ${loadingSvg ? 'loading' : 'ready'}`}>
          {svgContent && (
            <div
              className="external-svg-container animate-fade-in"
              data-pattern={id}
              dangerouslySetInnerHTML={{ __html: svgContent }}
              onClick={(e) => {
                const target = e.target.closest("[id^='cell-'], [data-cell]");
                if (target) {
                  const cellId = target.id?.replace("cell-", "") || target.getAttribute("data-cell");
                  if (cellId && !isSpecial(cellId)) handleCellClick(cellId);
                }
              }}
              onMouseOver={(e) => onSvgHover(e, true)}
              onMouseOut={(e) => onSvgHover(e, false)}
            />
          )}

          {!svgContent && !loadingSvg && (
            <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" className="voronoi-svg animate-fade-in">
              <defs>
                <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="#000" floodOpacity="0.5" />
                </filter>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {svgCells.map((c) => (
                <path
                  key={c.cellId}
                  d={c.path}
                  id={`cell-${c.cellId}`}
                  className={`voronoi-cell ${!!cells[c.cellId]?.url ? "has-pdf" : "empty"}`}
                  style={{ "--cell-color": c.color }}
                  onClick={() => handleCellClick(c.cellId)}
                  onMouseEnter={() => setHoveredCell(c.cellId)}
                  onMouseLeave={() => setHoveredCell(null)}
                />
              ))}
            </svg>
          )}

          {/* Persistent Label Overlay */}
          {labels.length > 0 && (
            <svg viewBox={viewBox} className="label-layer" preserveAspectRatio="xMidYMid meet">
              {labels.map(lbl => (
                <text
                  key={lbl.id}
                  x={lbl.x}
                  y={lbl.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="dynamic-cell-label"
                  style={{
                    fill: "#ffffff",
                    fontSize: `${lbl.fontSize}px`,
                    fontWeight: "600",
                    pointerEvents: "none",
                    textShadow: "0 1px 4px rgba(0,0,0,0.9)",
                    fontFamily: "'Titillium', sans-serif",
                    letterSpacing: "0.5px"
                  }}
                >
                  {lbl.lines.map((line, idx) => (
                    <tspan
                      key={idx}
                      x={lbl.x}
                      dy={idx === 0 ? `-${(lbl.lines.length - 1) * 0.45}em` : "1.15em"}
                    >
                      {line}
                    </tspan>
                  ))}
                </text>
              ))}
            </svg>
          )}
        </div>
      </div>

      {activePdf && (
        <PdfViewer
          url={activePdf.url ? `${activePdf.url}?t=${Date.now()}` : null}
          title={activePdf.name}
          author={activePdf.author}
          onClose={() => setActivePdf(null)}
        />
      )}

      <footer className="voronoi-footer">
        <div className="footer-content">
          <img src="/DDU Logo.svg" alt="DDU Logo" className="footer-logo" />
          <div className="footer-brand">
            <span className="brand-sub">Digital Design Unit</span>
          </div>
          <div className="footer-copyright">
            © {new Date().getFullYear()} • TU Darmstadt
          </div>
        </div>
      </footer>

      <style jsx global>{`
        .voronoi-footer {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          width: 100%;
          padding: 0.5rem 1rem;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 20;
          pointer-events: none;
          background: linear-gradient(to top, rgba(0,0,0,0.4), transparent);
        }
        .voronoi-footer > * {
          pointer-events: auto;
        }

        .footer-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          opacity: 0.6;
          transition: opacity 0.3s ease;
        }

        .footer-content:hover {
          opacity: 1;
        }

        .footer-logo {
          height: 50px;
          margin-bottom: 0.5rem;
          /* No filter needed if it's already orange/white, but adding a safety brightness if it's dark */
        }

        .footer-brand {
          display: flex;
          flex-direction: column;
          align-items: center;
          line-height: 1;
        }

        .brand-main {
          font-size: 1.5rem;
          font-weight: 800;
          letter-spacing: 2px;
          color: var(--accent);
        }

        .brand-sub {
          font-size: 0.6rem;
          text-transform: uppercase;
          letter-spacing: 4px;
          margin-top: 4px;
          color: var(--text-muted);
        }

        .footer-copyright {
          font-size: 0.6rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--text-muted);
          margin-top: 1rem;
        }

        .voronoi-map-stack {
          position: relative;
          width: 92vw;
          height: 92dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: opacity 0.4s ease;
        }
        
        .voronoi-map-stack.loading {
          opacity: 0;
        }
        
        .voronoi-map-stack.ready {
          opacity: 1;
        }

        .animate-fade-in {
          animation: mapFadeIn 0.6s ease-out forwards;
        }

        @keyframes mapFadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }

        .label-layer {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 5;
        }
        .external-svg-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: center;
        }
        .external-svg-container svg {
          width: 100%;
          height: 100%;
          display: block;
          filter: drop-shadow(0 20px 40px rgba(0,0,0,0.6));
          transition: transform 0.4s ease;
        }
        
        .external-svg-container[data-pattern='v2'] svg {
          transform: scale(0.85);
        }
        .external-svg-container [id^='cell-'], 
        .external-svg-container [data-cell] {
          cursor: pointer;
          transition: all 0.3s ease;
          fill: rgba(255, 255, 255, 0.08) !important;
          stroke: #ffffff !important;
          stroke-width: 1.5px !important;
          filter: drop-shadow(0 0 3px rgba(255,255,255,0.2));
        }
        /* Special Non-Clickable Cells */
        .external-svg-container[data-pattern='v2'] #cell-4,
        .external-svg-container[data-pattern='v2'] [data-cell='4'],
        .external-svg-container[data-pattern='v3'] #cell-2,
        .external-svg-container[data-pattern='v3'] [data-cell='2'],
        .external-svg-container[data-pattern='v4'] #cell-2,
        .external-svg-container[data-pattern='v4'] [data-cell='2'] {
          cursor: default !important;
          fill: rgba(255, 96, 0, 0.1) !important;
          stroke: var(--accent) !important;
          stroke-width: 8px !important;
          animation: breathe 3s infinite ease-in-out;
        }

        @keyframes breathe {
          0%, 100% { filter: drop-shadow(0 0 10px #ff6000); }
          50% { filter: drop-shadow(0 0 30px #ff6000) brightness(1.3); }
        }
        .external-svg-container [id^='cell-']:hover, 
        .external-svg-container [data-cell]:hover {
          fill: var(--accent) !important;
          stroke: #fff !important;
          stroke-width: 3px !important;
          filter: drop-shadow(0 0 15px var(--accent)) brightness(1.2);
          z-index: 10;
        }

        /* Shape Buttons (Global for Next.js Link) */
        .shape-btn {
          width: 24px;
          height: 24px;
          display: block;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .shape-btn:hover {
          background: rgba(255, 96, 0, 0.2);
          border-color: var(--accent);
          transform: scale(1.15);
        }

        .shape-btn.active {
          background: var(--accent);
          box-shadow: 0 0 15px var(--accent);
          border-color: transparent;
        }

        .left-half {
          width: 12px;
          border-radius: 24px 0 0 24px;
        }
        .full-circle {
          border-radius: 50%;
        }
        .right-half {
          width: 12px;
          border-radius: 0 24px 24px 0;
        }
      `}</style>

      <style jsx>{`
        .voronoi-container {
          height: 100dvh;
          overflow: hidden;
          background: var(--bg-primary, #1f1300);
          color: var(--text-primary, #fff8f0);
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0.2rem;
          font-family: 'Titillium', sans-serif;
        }

        .voronoi-header {
          position: absolute;
          top: 0.5rem;
          left: 0;
          right: 0;
          text-align: center;
          z-index: 20;
          pointer-events: none;
        }
        .voronoi-header > * {
          pointer-events: auto;
        }

        .voronoi-header h1 {
          font-size: 3.5rem;
          margin: 0;
          font-weight: 800;
          letter-spacing: -2px;
          text-transform: uppercase;
          line-height: 1.1;
        }

        .voronoi-header h1 span {
          color: #ff6000;
        }

        @media (max-width: 768px) {
          .voronoi-header h1 {
            font-size: 1.8rem;
            letter-spacing: -1px;
          }
        }

        .cell-info-container {
          position: absolute;
          top: 18%;
          left: 0;
          right: 0;
          text-align: center;
          z-index: 15;
          pointer-events: none;
        }

        .cell-name {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--accent, #ff6000);
          text-shadow: 0 0 20px rgba(255, 96, 0, 0.3);
          animation: fadeIn 0.3s ease-out;
        }
        
        .cell-name.empty {
          color: var(--text-muted, #a0a0a0);
          font-style: italic;
        }

        .cell-hint {
          color: var(--text-muted, #a0a0a0);
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          opacity: 0.5;
        }

        .voronoi-svg-wrapper {
          width: 100vw;
          height: 100dvh;
          position: absolute;
          top: 0;
          left: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .voronoi-svg {
          width: 100%;
          height: 100%;
          filter: drop-shadow(0 20px 50px rgba(0,0,0,0.5));
        }

        .voronoi-cell {
          fill: rgba(255, 255, 255, 0.08);
          stroke: #ffffff;
          stroke-width: 1.5;
          transition: all 0.3s ease;
          cursor: pointer;
          filter: drop-shadow(0 0 3px rgba(255,255,255,0.2));
        }

        .voronoi-cell.empty {
          fill: rgba(255, 255, 255, 0.05);
          stroke: rgba(255,255,255,0.1);
          stroke-width: 0.5;
          opacity: 0.4;
          filter: none;
        }

        .voronoi-cell:hover {
          fill: var(--accent) !important;
          stroke: #fff;
          stroke-width: 3;
          z-index: 10;
          filter: drop-shadow(0 0 15px var(--accent));
        }
        
        .voronoi-cell.has-pdf {
          stroke: #ffffff;
          stroke-width: 1.5;
          filter: drop-shadow(0 0 5px rgba(255,255,255,0.3));
        }
      `}</style>
    </div>
  );
}
