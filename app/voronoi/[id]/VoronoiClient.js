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
  const [editMode, setEditMode] = useState(false);
  const containerRef = useRef(null);

  // Load external SVG if it exists
  useEffect(() => {
    fetch(`/voronoi/${id}.svg`)
      .then((res) => {
        if (!res.ok) throw new Error("External SVG not found");
        return res.text();
      })
      .then((text) => setSvgContent(text))
      .catch(() => setSvgContent(null)); // Fallback to internal placeholder
  }, [id]);

  // Inject labels when SVG or cells change
  useEffect(() => {
    if (svgContent) {
      const timer = setTimeout(() => {
        const svg = containerRef.current?.querySelector("svg");
        if (!svg) return;

        // Clear existing labels
        svg.querySelectorAll(".dynamic-cell-label").forEach((el) => el.remove());

        // Use viewBox width to scale font size
        const vb = svg.viewBox.baseVal;
        const baseFontSize = vb.width ? vb.width / 25 : 4;

        for (let i = 1; i <= 20; i++) {
          const cell = svg.querySelector(`#cell-${i}`);
          if (cell && cells[i]?.name) {
            const bbox = cell.getBBox();
            const name = cells[i].name;
            
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("x", bbox.x + bbox.width / 2);
            text.setAttribute("y", bbox.y + bbox.height / 2);
            text.setAttribute("text-anchor", "middle");
            text.setAttribute("dominant-baseline", "middle");
            text.setAttribute("class", "dynamic-cell-label");
            text.style.fill = "var(--text-primary, white)";
            
            // Calculate font size to fit width
            const maxWidth = bbox.width * 0.85;
            const maxHeight = bbox.height * 0.6;
            let currentFontSize = baseFontSize;
            
            // Rough estimation of text width
            const charWidth = currentFontSize * 0.55;
            const textWidth = name.length * charWidth;
            
            if (textWidth > maxWidth) {
              currentFontSize = (maxWidth / name.length) / 0.55;
            }
            
            // Limit to max height
            currentFontSize = Math.min(currentFontSize, maxHeight);
            
            text.style.fontSize = `${currentFontSize}px`;
            text.style.fontWeight = "700";
            text.style.pointerEvents = "none";
            text.style.textShadow = "0 1px 4px rgba(0,0,0,0.5)";
            text.style.fontFamily = "'Titillium', sans-serif";
            text.textContent = name;
            
            svg.appendChild(text);
          }
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [svgContent, cells]);

  const handleCellClick = (cellId) => {
    const cellData = cells[cellId];
    if (cellData?.url) {
      setActivePdf(cellData);
    } else if (editMode) {
      const confirmEdit = confirm(`Cell ${cellId} is not configured. Would you like to configure it now?`);
      if (confirmEdit) {
        window.location.href = `/?tab=voronoi&v=${id}&c=${cellId}`;
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
    { cellId: 1, path: "M 0,0 L 40,0 L 50,40 L 0,60 Z", color: "rgba(255, 96, 0, 0.4)" },
    { cellId: 2, path: "M 40,0 L 100,0 L 100,50 L 70,60 L 50,40 Z", color: "rgba(255, 96, 0, 0.5)" },
    { cellId: 3, path: "M 0,60 L 50,40 L 40,100 L 0,100 Z", color: "rgba(255, 96, 0, 0.6)" },
    { cellId: 4, path: "M 50,40 L 70,60 L 80,100 L 40,100 Z", color: "rgba(255, 96, 0, 0.7)" },
    { cellId: 5, path: "M 70,60 L 100,50 L 100,100 L 80,100 Z", color: "rgba(255, 96, 0, 0.8)" },
  ];

  // Event Delegation
  const onSvgClick = (e) => {
    const target = e.target.closest("[id^='cell-'], [data-cell]");
    if (target) {
      const cellId = target.id?.replace("cell-", "") || target.getAttribute("data-cell");
      if (cellId) handleCellClick(cellId);
    }
  };

  const onSvgHover = (e, isEnter) => {
    const target = e.target.closest("[id^='cell-'], [data-cell]");
    if (target) {
      const cellId = target.id?.replace("cell-", "") || target.getAttribute("data-cell");
      setHoveredCell(isEnter ? cellId : null);
    }
  };

  return (
    <div className="voronoi-container">
      <header className="voronoi-header">
        <h1>Voronoi <span>{id.toUpperCase()}</span></h1>
        <p>Interactive PDF Explorer</p>
        <div className="voronoi-controls mt-4">
          <div className="pattern-switcher" style={{ display: "flex", gap: "0.5rem", justifyContent: "center", marginBottom: "1rem" }}>
            {["v2", "v3", "v4"].map(vId => (
              <Link 
                key={vId} 
                href={`/voronoi/${vId}`} 
                className={`btn btn-sm ${vId === id ? 'btn-primary' : 'btn-ghost'}`}
                style={{ minWidth: "100px" }}
              >
                {vId === id ? "● " : ""}{vId.toUpperCase()}
              </Link>
            ))}
          </div>
          
          <div className="meta-controls" style={{ display: "flex", gap: "2rem", justifyContent: "center", alignItems: "center", opacity: 0.8 }}>
            <div className="cell-counter" style={{ fontSize: "0.8rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px" }}>
              <span style={{ color: "var(--accent)" }}>{configuredCount}</span> / {totalCells} Cells Ready
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.8rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px" }}>
              <input 
                type="checkbox" 
                checked={editMode} 
                onChange={(e) => setEditMode(e.target.checked)}
                style={{ accentColor: "var(--accent)" }}
              />
              Admin Mode
            </label>
          </div>
        </div>
      </header>

      <div className="voronoi-svg-wrapper" ref={containerRef}>
        <div className="cell-info-container">
          {hoveredCell && cells[hoveredCell]?.name ? (
            <div className="cell-name">{cells[hoveredCell].name}</div>
          ) : hoveredCell ? (
            <div className="cell-name empty">Unconfigured Cell {hoveredCell}</div>
          ) : (
            <div className="cell-hint">Select a cell to view document</div>
          )}
        </div>

        {svgContent ? (
          <div 
            className="external-svg-container"
            dangerouslySetInnerHTML={{ __html: svgContent }}
            onClick={onSvgClick}
            onMouseOver={(e) => onSvgHover(e, true)}
            onMouseOut={(e) => onSvgHover(e, false)}
          />
        ) : (
          <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" className="voronoi-svg">
            <defs>
              <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="#000" floodOpacity="0.5"/>
              </filter>
              <filter id="glow">
                <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            
            {svgCells.map((c) => {
              const hasPdf = !!cells[c.cellId]?.url;
              return (
                <path
                  key={c.cellId}
                  d={c.path}
                  id={`cell-${c.cellId}`}
                  className={`voronoi-cell ${hasPdf ? "has-pdf" : "empty"}`}
                  style={{ "--cell-color": c.color }}
                  onClick={() => handleCellClick(c.cellId)}
                  onMouseEnter={() => setHoveredCell(c.cellId)}
                  onMouseLeave={() => setHoveredCell(null)}
                />
              );
            })}
          </svg>
        )}
      </div>

      {activePdf && (
        <PdfViewer 
          url={activePdf.url} 
          title={activePdf.name}
          onClose={() => setActivePdf(null)} 
        />
      )}

      <style jsx global>{`
        .external-svg-container svg {
          width: 100%;
          height: 100%;
          filter: drop-shadow(0 20px 40px rgba(0,0,0,0.6));
        }
        .external-svg-container [id^='cell-'], 
        .external-svg-container [data-cell] {
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .external-svg-container [id^='cell-']:hover, 
        .external-svg-container [data-cell]:hover {
          filter: brightness(1.1);
          stroke: #ff6000;
          stroke-width: 2px;
        }
      `}</style>

      <style jsx>{`
        .voronoi-container {
          min-height: 100vh;
          background: var(--bg-primary, #1f1300);
          color: var(--text-primary, #fff8f0);
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 2rem;
          font-family: 'Titillium', sans-serif;
        }

        .voronoi-header {
          text-align: center;
          margin-bottom: 4rem;
          z-index: 10;
        }

        .voronoi-header h1 {
          font-size: 3.5rem;
          margin: 0;
          font-weight: 800;
          letter-spacing: -2px;
          text-transform: uppercase;
        }

        .voronoi-header h1 span {
          color: var(--accent, #ff6000);
        }

        .voronoi-header p {
          color: var(--text-secondary, #e7e7e7);
          font-size: 1.1rem;
          margin-top: 0.5rem;
          letter-spacing: 2px;
          text-transform: uppercase;
        }

        .mt-4 { margin-top: 1rem; display: inline-block; }

        .voronoi-svg-wrapper {
          width: 90vw;
          max-width: 700px;
          aspect-ratio: 1;
          position: relative;
        }

        .cell-info-container {
          margin-bottom: 1.5rem;
          text-align: center;
          min-height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
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
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 2px;
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
          fill: var(--cell-color);
          stroke: rgba(255,255,255,0.1);
          stroke-width: 0.5;
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .voronoi-cell.empty {
          fill: var(--bg-secondary, #31393c);
          opacity: 0.6;
        }

        .voronoi-cell:hover {
          stroke: var(--accent, #ff6000);
          stroke-width: 2;
          z-index: 10;
        }
        
        .voronoi-cell.has-pdf:hover {
          fill: var(--accent, #ff6000);
          filter: url(#glow);
        }
      `}</style>
    </div>
  );
}
