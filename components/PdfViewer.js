"use client";

import { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";

// We use the CDN to load the worker to avoid complex Webpack config in Next.js
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function PdfViewer({ url, title, onClose }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [width, setWidth] = useState(800);
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    const updateWidth = () => {
      const availableWidth = window.innerWidth * (window.innerWidth < 768 ? 0.95 : 0.9);
      setWidth(Math.min(availableWidth, 1000));
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  return (
    <div className="pdf-viewer-overlay" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="pdf-viewer-modal">
        <div className="pdf-header">
          <div className="pdf-title">{title || "Document View"}</div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              className={`btn btn-sm ${isZoomed ? 'btn-primary' : 'btn-ghost'}`} 
              onClick={() => setIsZoomed(!isZoomed)}
              title="Toggle Fit/Zoom"
            >
              {isZoomed ? "Fit" : "Zoom"} View
            </button>
            <button className="btn btn-danger btn-icon btn-sm" onClick={onClose} title="Close PDF">
              ✕
            </button>
          </div>
        </div>
        
        <div className={`pdf-document-container ${isZoomed ? 'zoomed' : ''}`}>
          <Document 
            file={url} 
            onLoadSuccess={onDocumentLoadSuccess}
            loading={<div className="pdf-loading">Loading Slide...</div>}
            error={<div className="pdf-error">Error loading PDF.</div>}
          >
            <div key={pageNumber} className="pdf-page-wrapper slide-in">
              <Page 
                pageNumber={pageNumber} 
                renderTextLayer={false} 
                renderAnnotationLayer={false}
                className="pdf-page"
                width={isZoomed ? width * 1.5 : width}
                height={!isZoomed && typeof window !== 'undefined' ? window.innerHeight * 0.7 : undefined}
              />
            </div>
          </Document>
        </div>

        <div className="pdf-footer">
          <div className="pdf-controls">
            <button 
              className="btn btn-primary btn-sm" 
              disabled={pageNumber <= 1} 
              onClick={() => setPageNumber(prev => Math.max(1, prev - 1))}
            >
              ← Prev
            </button>
            <span className="pdf-page-info">
              {pageNumber} / {numPages || '--'}
            </span>
            <button 
              className="btn btn-primary btn-sm" 
              disabled={pageNumber >= numPages} 
              onClick={() => setPageNumber(prev => Math.min(numPages, prev + 1))}
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .pdf-viewer-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.95);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(12px);
        }
        .pdf-viewer-modal {
          background: #000;
          border: 1px solid #333;
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          height: 90vh;
          width: 95vw;
          max-width: 1000px;
          overflow: hidden;
          box-shadow: 0 40px 100px rgba(0,0,0,0.9);
        }
        .pdf-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px 20px;
          background: rgba(20,20,20,0.8);
          border-bottom: 1px solid #222;
        }
        .pdf-title {
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
          font-size: 0.8rem;
          color: #888;
        }
        .pdf-footer {
          padding: 15px;
          background: rgba(20,20,20,0.8);
          border-top: 1px solid #222;
          display: flex;
          justify-content: center;
        }
        .pdf-controls {
          display: flex;
          align-items: center;
          gap: 20px;
          background: #1a1a1a;
          padding: 6px 15px;
          border-radius: 50px;
          border: 1px solid #333;
        }
        .pdf-page-info {
          color: #fff;
          font-weight: 700;
          font-size: 1rem;
          min-width: 60px;
          text-align: center;
          font-variant-numeric: tabular-nums;
        }
        .pdf-document-container {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #000;
          padding: 10px;
          overflow: auto; /* Enable scrolling for large pages */
          position: relative;
          -webkit-overflow-scrolling: touch;
        }
        .pdf-document-container.zoomed {
          align-items: flex-start;
        }
        .pdf-page-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .slide-in {
          animation: slideIn 0.3s ease-out;
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .pdf-loading, .pdf-error {
          color: #555;
          font-size: 1.1rem;
          font-weight: 600;
        }
        @media (max-width: 768px) {
          .pdf-viewer-modal {
            height: 95vh;
            width: 100vw;
            border-radius: 0;
          }
          .pdf-controls {
            gap: 15px;
            padding: 5px 12px;
          }
        }
      `}</style>
    </div>
  );
}
