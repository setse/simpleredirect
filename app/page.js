"use client";

import { useState, useEffect, useCallback } from "react";

const TOTAL_CODES = 20;

export default function Dashboard() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [links, setLinks] = useState({});
  const [scans, setScans] = useState({});
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editUrl, setEditUrl] = useState("");
  const [toasts, setToasts] = useState([]);
  const [saving, setSaving] = useState(false);

  // Voronoi Upload States
  const [activeTab, setActiveTab] = useState("redirects"); // "redirects" or "voronoi"
  const [voronoiUploadId, setVoronoiUploadId] = useState("v1");
  const [voronoiCellId, setVoronoiCellId] = useState("1");
  const [voronoiCellName, setVoronoiCellName] = useState("");
  const [voronoiFile, setVoronoiFile] = useState(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  // ── Toast helper ──────────────────────────
  const showToast = useCallback((message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const [voronoiCells, setVoronoiCells] = useState({});

  const fetchVoronoiCells = useCallback(async (vId) => {
    try {
      const res = await fetch(`/api/voronoi-pdf?voronoiId=${vId}`);
      if (res.ok) {
        const data = await res.json();
        setVoronoiCells(data.cells || {});
      }
    } catch (err) {
      console.error("Failed to fetch voronoi cells:", err);
    }
  }, []);

  // ── Fetch links from API ──────────────────
  const fetchLinks = useCallback(async () => {
    try {
      const res = await fetch("/api/links", {
        headers: { "x-admin-password": password },
      });
      if (!res.ok) throw new Error("Unauthorized");
      const data = await res.json();
      setLinks(data.links || {});
      setScans(data.scans || {});
    } catch (err) {
      console.error("Failed to fetch links:", err);
    }
  }, [password]);

  // ── Login handler ─────────────────────────
  const handleLogin = useCallback(async (e, forcedPassword) => {
    if (e) e.preventDefault();
    const pw = forcedPassword || password;
    setLoginError("");
    setLoading(true);

    try {
      const res = await fetch("/api/links", {
        headers: { "x-admin-password": pw },
      });

      if (res.ok) {
        setAuthenticated(true);
        if (forcedPassword) setPassword(pw);
        localStorage.setItem("admin-password", pw);
        const data = await res.json();
        setLinks(data.links || {});
        setScans(data.scans || {});
      } else {
        if (!forcedPassword) setLoginError("Incorrect password. Please try again.");
        localStorage.removeItem("admin-password");
      }
    } catch (err) {
      setLoginError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [password]);

  // Auto-login if password is saved
  useEffect(() => {
    const saved = localStorage.getItem("admin-password");
    if (saved) {
      handleLogin(null, saved);
    }
  }, [handleLogin]);

  // ── Save link handler ─────────────────────
  const handleSaveLink = async () => {
    if (saving) return;
    setSaving(true);

    try {
      const res = await fetch("/api/links", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({ id: editingId, url: editUrl }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }

      const data = await res.json();
      setLinks((prev) => ({ ...prev, [editingId]: data.url }));
      setEditingId(null);
      setEditUrl("");
      showToast(`QR #${editingId} updated successfully`);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Clear link handler ─────────────────────
  const handleClearLink = async (id) => {
    try {
      const res = await fetch("/api/links", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({ id, url: "" }),
      });

      if (res.ok) {
        setLinks((prev) => ({ ...prev, [id]: null }));
        showToast(`QR #${id} cleared`);
      }
    } catch (err) {
      showToast("Failed to clear link", "error");
    }
  };

  // ── Download QR code ───────────────────────
  const handleDownload = async (id) => {
    try {
      const res = await fetch(`/api/qr/${id}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `qr-${id}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`QR #${id} downloaded`);
    } catch (err) {
      showToast("Download failed", "error");
    }
  };

  // ── Auto-refresh links ────────────────────
  useEffect(() => {
    if (authenticated) {
      const interval = setInterval(fetchLinks, 30000);
      return () => clearInterval(interval);
    }
  }, [authenticated, fetchLinks]);

  // ── Computed stats ────────────────────────
  const activeCount = Object.values(links).filter(Boolean).length;
  const totalScans = Object.values(scans).reduce((a, b) => a + b, 0);

  // ── Upload/Update Voronoi PDF ──────────────────────
  const handleUploadPdf = async (e) => {
    e.preventDefault();
    if (!voronoiCellName && !voronoiFile) {
      showToast("Please provide a name or select a file", "error");
      return;
    }

    setUploadingPdf(true);
    const formData = new FormData();
    if (voronoiFile) formData.append("file", voronoiFile);
    formData.append("voronoiId", voronoiUploadId);
    formData.append("cellId", voronoiCellId);
    formData.append("cellName", voronoiCellName);

    try {
      const res = await fetch("/api/voronoi-pdf", {
        method: "POST",
        headers: { "x-admin-password": password },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }

      showToast(voronoiFile ? `PDF & Name updated for ${voronoiUploadId}` : `Name updated for Cell ${voronoiCellId}`);
      setVoronoiFile(null);
      // Reset file input visually
      const fileInput = document.getElementById("voronoi-file-input");
      if (fileInput) fileInput.value = "";
      
      // Refresh cell data
      fetchVoronoiCells(voronoiUploadId);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setUploadingPdf(false);
    }
  };

  // Pre-fill cell name when cell ID changes
  useEffect(() => {
    if (voronoiCells[voronoiCellId]) {
      setVoronoiCellName(voronoiCells[voronoiCellId].name || "");
    } else {
      setVoronoiCellName("");
    }
  }, [voronoiCellId, voronoiCells]);

  // ── Handle Deep Links ────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    const v = params.get("v");
    const c = params.get("c");
    
    if (tab === "voronoi") {
      setActiveTab("voronoi");
      if (v) setVoronoiUploadId(v);
      if (c) setVoronoiCellId(c);
      
      // Clean up URL
      window.history.replaceState({}, "", "/");
    }
  }, []);

  // Mini-map SVG content
  const [miniMapSvg, setMiniMapSvg] = useState(null);

  useEffect(() => {
    if (activeTab === "voronoi") {
      fetchVoronoiCells(voronoiUploadId);
      fetch(`/voronoi/${voronoiUploadId}.svg`)
        .then(res => res.text())
        .then(text => {
          if (text.includes("<svg")) {
            setMiniMapSvg(text);
          } else {
            setMiniMapSvg(null);
          }
        })
        .catch(() => setMiniMapSvg(null));
    }
  }, [activeTab, voronoiUploadId, fetchVoronoiCells]);

  // Colorize mini-map cells
  useEffect(() => {
    if (miniMapSvg && voronoiCells) {
      const timer = setTimeout(() => {
        const container = document.querySelector(".mini-map-svg-container");
        if (!container) return;
        const svg = container.querySelector("svg");
        if (!svg) return;
        
        for (let i = 1; i <= 20; i++) {
          const cell = svg.querySelector(`#cell-${i}`) || svg.querySelector(`[data-cell="${i}"]`);
          if (cell) {
            cell.style.fill = voronoiCells[i] ? "var(--accent)" : "rgba(255,255,255,0.05)";
            cell.style.stroke = voronoiCellId === i.toString() ? "var(--accent)" : "rgba(255,255,255,0.2)";
            cell.style.strokeWidth = voronoiCellId === i.toString() ? "3" : "1";
            cell.style.cursor = "pointer";
            cell.style.transition = "all 0.2s";
          }
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [miniMapSvg, voronoiCells, voronoiCellId]);

  // ── LOGIN SCREEN ──────────────────────────
  if (!authenticated) {
    return (
      <div className="login-container">
        <div className="login-card">
          <span className="login-icon">🔐</span>
          <h1>SimpleRedirect</h1>
          <p>Enter your admin password to manage QR code destinations.</p>
          <form className="login-form" onSubmit={handleLogin}>
            <input
              id="password-input"
              type="password"
              placeholder="Admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              required
            />
            {loginError && <div className="login-error">{loginError}</div>}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? "Authenticating..." : "Sign In →"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── DASHBOARD ─────────────────────────────
  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="dashboard-title">
          <div className="dashboard-title-icon" style={{ background: 'var(--accent)' }}>📱</div>
          <div>
            <h1>SimpleRedirect</h1>
            <p>Manage your {TOTAL_CODES} dynamic QR codes</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn btn-ghost btn-sm" onClick={fetchLinks}>
            ↻ Refresh
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setAuthenticated(false);
              setPassword("");
              localStorage.removeItem("admin-password");
            }}
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Tab Switcher */}
      <div className="tab-switcher" style={{ display: "flex", gap: "1rem", marginBottom: "2.5rem", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "1rem" }}>
        <button 
          className={`btn ${activeTab === "redirects" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setActiveTab("redirects")}
        >
          📱 Dynamic Redirects
        </button>
        <button 
          className={`btn ${activeTab === "voronoi" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setActiveTab("voronoi")}
        >
          🎨 Voronoi PDFs
        </button>
      </div>

      {activeTab === "redirects" ? (
        <>
          {/* Stats */}
          <div className="stats-bar">
            <div className="stat-card">
              <div className="stat-label">Total QR Codes</div>
              <div className="stat-value accent">{TOTAL_CODES}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Active Links</div>
              <div className="stat-value success">{activeCount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Unconfigured</div>
              <div className="stat-value warning">{TOTAL_CODES - activeCount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Scans</div>
              <div className="stat-value">{totalScans.toLocaleString()}</div>
            </div>
          </div>

          {/* QR Grid */}
          <div className="qr-grid">
            {Array.from({ length: TOTAL_CODES }, (_, i) => i + 1).map((id) => (
              <div key={id} className="qr-card" id={`qr-card-${id}`}>
                <div className="qr-card-header">
                  <div className="qr-id">
                    <span className="qr-badge">QR #{id}</span>
                  </div>
                  <span
                    className={`qr-status ${links[id] ? "active" : "inactive"}`}
                  >
                    {links[id] ? "● Active" : "○ Inactive"}
                  </span>
                </div>

                <div className="qr-image-container">
                  <img
                    className="qr-image"
                    src={`/api/qr/${id}`}
                    alt={`QR Code #${id}`}
                    loading="lazy"
                  />
                </div>

                <div className="qr-url-section">
                  <div className="qr-url-label">Destination URL</div>
                  <div
                    className={`qr-url-display ${!links[id] ? "empty" : ""}`}
                    title={links[id] || ""}
                  >
                    {links[id] || "No destination set"}
                  </div>
                </div>

                <div className="qr-scan-count">
                  📊 {(scans[id] || 0).toLocaleString()} scan
                  {scans[id] !== 1 ? "s" : ""}
                </div>

                <div className="qr-card-actions">
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      setEditingId(id);
                      setEditUrl(links[id] || "");
                    }}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleDownload(id)}
                  >
                    ⬇ Download
                  </button>
                  {links[id] && (
                    <button
                      className="btn btn-danger btn-sm btn-icon"
                      onClick={() => handleClearLink(id)}
                      title="Clear link"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* Voronoi Management Section */
        <div className="voronoi-management-container" style={{ 
          display: "flex", 
          flexDirection: "column",
          gap: "2rem", 
          maxWidth: "1000px", 
          margin: "0 auto",
        }}>
          {/* Map & Status Header (Moved to Top) */}
          <div className="voronoi-status-top" style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "2rem",
            width: "100%"
          }}>
            <div className="voronoi-map-card" style={{ 
              padding: "2rem", 
              background: "var(--bg-card)", 
              borderRadius: "var(--radius-lg)", 
              border: "1px solid var(--border-subtle)",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              alignItems: "center"
            }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: "700", width: "100%" }}>Interactive Preview: {voronoiUploadId.toUpperCase()}</h3>
              <div style={{ 
                width: "100%", 
                maxWidth: "400px",
                aspectRatio: "1",
                background: "var(--bg-input)", 
                borderRadius: "var(--radius-sm)", 
                padding: "1rem", 
                border: "1px solid var(--border-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden"
              }}>
                {miniMapSvg ? (
                  <div 
                    className="mini-map-svg-container"
                    dangerouslySetInnerHTML={{ __html: miniMapSvg }}
                    style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
                    onClick={(e) => {
                      const target = e.target.closest("[id^='cell-'], [data-cell]");
                      if (target) {
                        const cId = target.id?.replace("cell-", "") || target.getAttribute("data-cell");
                        if (cId) setVoronoiCellId(cId);
                      }
                    }}
                  />
                ) : (
                  <div style={{ color: "var(--text-muted)", fontSize: "0.8rem", textAlign: "center" }}>
                    <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>🖼️</div>
                    Preview for {voronoiUploadId} not found.
                  </div>
                )}
              </div>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "center" }}>
                Click a cell on the map to select it for editing.
              </p>
            </div>

            <div className="voronoi-status-list" style={{ 
              padding: "2rem", 
              background: "var(--bg-card)", 
              borderRadius: "var(--radius-lg)", 
              border: "1px solid var(--border-subtle)",
              maxHeight: "500px",
              display: "flex",
              flexDirection: "column"
            }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: "700", marginBottom: "1.5rem" }}>Cell Configuration</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", overflowY: "auto", paddingRight: "0.5rem" }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map(id => (
                  <div 
                    key={id} 
                    onClick={() => setVoronoiCellId(id.toString())}
                    style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      gap: "0.75rem", 
                      padding: "0.6rem 1rem", 
                      borderRadius: "var(--radius-sm)",
                      background: voronoiCellId === id.toString() ? "var(--bg-card-hover)" : "transparent",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      border: voronoiCellId === id.toString() ? "1px solid var(--accent)" : "1px solid transparent",
                      transition: "all 0.2s"
                    }}
                  >
                    <div style={{ 
                      width: "10px", 
                      height: "10px", 
                      borderRadius: "50%", 
                      background: voronoiCells[id] ? "var(--accent)" : "#444",
                      boxShadow: voronoiCells[id] ? "0 0 10px var(--accent)" : "none"
                    }} />
                    <span style={{ fontWeight: "700", minWidth: "20px" }}>{id}</span>
                    <span style={{ 
                      color: voronoiCells[id] ? "var(--text-primary)" : "var(--text-muted)",
                      fontWeight: voronoiCells[id] ? "600" : "400",
                      overflow: "hidden", 
                      textOverflow: "ellipsis", 
                      whiteSpace: "nowrap" 
                    }}>
                      {voronoiCells[id]?.name || "Empty"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="voronoi-management-section" style={{ 
            padding: "3rem", 
            background: "var(--bg-card)", 
            borderRadius: "var(--radius-lg)", 
            border: "1px solid var(--border-subtle)",
          }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "0.5rem" }}>Update Cell: {voronoiCellId}</h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: "2.5rem" }}>Modify display name or upload a new PDF document.</p>
            
            <form onSubmit={handleUploadPdf} style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem" }}>
                <div className="input-group">
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Voronoi Pattern</label>
                  <select 
                    value={voronoiUploadId} 
                    onChange={(e) => setVoronoiUploadId(e.target.value)} 
                    style={{ width: "100%", padding: "0.85rem", borderRadius: "var(--radius-sm)", background: "var(--bg-input)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)", outline: "none" }}
                  >
                    <option value="v2">Pattern v2</option>
                    <option value="v3">Pattern v3</option>
                    <option value="v4">Pattern v4</option>
                  </select>
                </div>
                
                <div className="input-group">
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Cell to Edit</label>
                  <select 
                    value={voronoiCellId} 
                    onChange={(e) => setVoronoiCellId(e.target.value)} 
                    style={{ width: "100%", padding: "0.85rem", borderRadius: "var(--radius-sm)", background: "var(--bg-input)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)", outline: "none" }}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map(n => (
                      <option key={n} value={n.toString()}>
                        {voronoiCells[n] ? "🟢" : "⚪"} Cell {n} {voronoiCells[n] ? `(${voronoiCells[n].name})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="input-group">
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Display Name</label>
                <input 
                  id="voronoi-cell-name-input"
                  type="text"
                  placeholder="e.g., Ground Floor Plan..."
                  value={voronoiCellName}
                  onChange={(e) => setVoronoiCellName(e.target.value)}
                  style={{ width: "100%", padding: "0.85rem", borderRadius: "var(--radius-sm)", background: "var(--bg-input)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)", outline: "none" }}
                />
              </div>

              <div className="input-group">
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Document (PDF)</label>
                <input 
                  id="voronoi-file-input"
                  type="file" 
                  accept="application/pdf" 
                  onChange={(e) => setVoronoiFile(e.target.files[0])}
                  style={{ width: "100%", padding: "0.85rem", borderRadius: "var(--radius-sm)", background: "var(--bg-input)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                />
                {voronoiCells[voronoiCellId] && (
                  <p style={{ fontSize: "0.75rem", color: "var(--success)", marginTop: "0.5rem" }}>
                    ✓ Existing document linked. Leave empty to keep it.
                  </p>
                )}
              </div>

              <button type="submit" className="btn btn-primary btn-lg" disabled={uploadingPdf} style={{ padding: "1.1rem", marginTop: "1rem", fontSize: "1rem" }}>
                {uploadingPdf ? "Saving..." : voronoiFile ? "🚀 Upload PDF & Save" : "💾 Save Name Only"}
              </button>
            </form>
            
            <div style={{ marginTop: "3rem", paddingTop: "2rem", borderTop: "1px solid var(--border-subtle)", textAlign: "center" }}>
              <a href="/voronoi-hub" target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                Open Preview Hub ↗
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingId && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setEditingId(null);
            }
          }}
        >
          <div className="modal">
            <h2>Edit QR #{editingId}</h2>
            <p>Set the destination URL for this QR code. The QR code image will stay the same.</p>

            <div className="modal-input-group">
              <label htmlFor="edit-url">Destination URL</label>
              <input
                id="edit-url"
                type="url"
                placeholder="https://example.com"
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveLink();
                  if (e.key === "Escape") setEditingId(null);
                }}
              />
              <div className="input-hint">
                https:// will be added automatically if omitted. Leave empty to deactivate.
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="btn btn-ghost"
                onClick={() => setEditingId(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveLink}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            <span>{toast.type === "success" ? "✓" : "✕"}</span>
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}
