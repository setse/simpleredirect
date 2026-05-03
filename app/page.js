"use client";

import { useState, useEffect, useCallback } from "react";

const TOTAL_CODES = 20;

const SPECIAL_CELLS = {
  v2: [4],
  v3: [2],
  v4: [2]
};

const isSpecial = (vId, cId) => {
  const specialList = SPECIAL_CELLS[vId] || [];
  return specialList.includes(parseInt(cId));
};

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
  const [activeTab, setActiveTab] = useState("voronoi"); // "redirects" or "voronoi"
  const [voronoiUploadId, setVoronoiUploadId] = useState("v2");
  const [voronoiCellId, setVoronoiCellId] = useState("1");
  const [voronoiCellName, setVoronoiCellName] = useState("");
  const [voronoiCellAuthor, setVoronoiCellAuthor] = useState("");
  const [voronoiRedirectUrl, setVoronoiRedirectUrl] = useState("");
  const [voronoiFile, setVoronoiFile] = useState(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [miniMapSvg, setMiniMapSvg] = useState(null);
  const [availableCellIds, setAvailableCellIds] = useState([1, 2, 3, 4, 5]);
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
      } else {
        throw new Error("Failed to load cell data");
      }
    } catch (err) {
      showToast("Sync Error: " + err.message, "error");
    }
  }, [showToast]);

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

  // Manually highlight active cell in preview since it's injected via innerHTML
  useEffect(() => {
    const container = document.querySelector(".preview-scope");
    if (!container) return;
    
    container.querySelectorAll("[id^='cell-'], [data-cell]").forEach(el => {
      el.setAttribute("data-active", "false");
    });
    
    const active = container.querySelector(`#cell-${voronoiCellId}, [data-cell="${voronoiCellId}"]`);
    if (active) {
      active.setAttribute("data-active", "true");
    }
  }, [voronoiCellId, miniMapSvg]);

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
    if (!voronoiCellName && !voronoiFile && !voronoiRedirectUrl) {
      showToast("Please provide a name, redirect URL, or select a file", "error");
      return;
    }

    setUploadingPdf(true);
    const formData = new FormData();
    if (voronoiFile) formData.append("file", voronoiFile);
    formData.append("voronoiId", voronoiUploadId);
    formData.append("cellId", voronoiCellId);
    formData.append("cellName", voronoiCellName);
    formData.append("cellAuthor", voronoiCellAuthor);
    formData.append("redirectUrl", voronoiRedirectUrl);

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

      showToast(voronoiFile ? "PDF & Details saved!" : "Cell details updated!");
      setVoronoiFile(null);
      // Re-fetch to ensure local state is perfect
      await fetchVoronoiCells(voronoiUploadId);
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

  const handleResetCell = async () => {
    if (!confirm(`Are you sure you want to reset Cell ${voronoiCellId} in ${voronoiUploadId.toUpperCase()}? This will delete the name and PDF.`)) {
      return;
    }

    setUploadingPdf(true);
    try {
      const res = await fetch(`/api/voronoi-pdf?voronoiId=${voronoiUploadId}&cellId=${voronoiCellId}`, {
        method: "DELETE",
        headers: { "x-admin-password": password },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Reset failed");
      }

      showToast(`Cell ${voronoiCellId} has been reset.`);
      setVoronoiCellName("");
      setVoronoiCellAuthor("");
      setVoronoiRedirectUrl("");
      setVoronoiFile(null);
      await fetchVoronoiCells(voronoiUploadId);
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
      setVoronoiCellAuthor(voronoiCells[voronoiCellId].author || "");
      setVoronoiRedirectUrl(voronoiCells[voronoiCellId].redirectUrl || "");
    } else {
      setVoronoiCellName("");
      setVoronoiCellAuthor("");
      setVoronoiRedirectUrl("");
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

  // ── Handle Deep Links ────────────────────

  useEffect(() => {
    if (activeTab === "voronoi") {
      fetchVoronoiCells(voronoiUploadId);
      fetch(`/voronoi/${voronoiUploadId}.svg`)
        .then(res => res.text())
        .then(text => {
          if (text.includes("<svg")) {
            setMiniMapSvg(text);
            
            // Extract cell IDs from SVG
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, "image/svg+xml");
            const cellElements = doc.querySelectorAll("[id^='cell-'], [data-cell]");
            const ids = Array.from(cellElements).map(el => {
              const idStr = el.id?.replace("cell-", "") || el.getAttribute("data-cell");
              return parseInt(idStr);
            }).filter(id => !isNaN(id));
            
            if (ids.length > 0) {
              setAvailableCellIds([...new Set(ids)].sort((a, b) => a - b));
            }
          } else {
            setMiniMapSvg(null);
            setAvailableCellIds([1, 2, 3, 4, 5]);
          }
        })
        .catch(() => {
          setMiniMapSvg(null);
          setAvailableCellIds([1, 2, 3, 4, 5]);
        });
    }
  }, [activeTab, voronoiUploadId, fetchVoronoiCells]);

  // Sync cell selection when available IDs change
  useEffect(() => {
    if (availableCellIds.length > 0) {
      const currentIdNum = parseInt(voronoiCellId);
      if (!availableCellIds.includes(currentIdNum)) {
        setVoronoiCellId(availableCellIds[0].toString());
      }
    }
  }, [availableCellIds, voronoiCellId]);

  // Colorize mini-map cells
  useEffect(() => {
    if (miniMapSvg && voronoiCells) {
      const timer = setTimeout(() => {
        const container = document.querySelector(".mini-map-svg-container");
        if (!container) return;
        const svg = container.querySelector("svg");
        if (!svg) return;
        
        for (let i = 1; i <= 20; i++) {
          const cells = svg.querySelectorAll(`#cell-${i}, [data-cell="${i}"]`);
          cells.forEach(cell => {
            cell.style.fill = voronoiCells[i] ? "var(--accent)" : "rgba(255,255,255,0.05)";
            cell.style.stroke = voronoiCellId === i.toString() ? "var(--accent)" : "rgba(255,255,255,0.2)";
            cell.style.strokeWidth = voronoiCellId === i.toString() ? "3px" : "1px";
            cell.style.opacity = (voronoiCellId === i.toString() || !voronoiCellId) ? "1" : "0.7";
          });
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
        <div className="dashboard-title" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <img src="/DDU Logo.svg" alt="DDU Logo" style={{ height: "45px" }} />
          <div>
            <h1 style={{ fontSize: "1.6rem", fontWeight: "800", letterSpacing: "-0.5px" }}>DDU Aggregations</h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "2px" }}>State of the Art Workshop</p>
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

      {/* Tab Switcher (Redirects hidden) */}
      <div className="tab-switcher" style={{ display: "none", gap: "1rem", marginBottom: "2.5rem", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "1rem" }}>
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

      {activeTab === "redirects" ? null : (
        /* Voronoi Management Section */
        <div className="voronoi-management-container" style={{ 
          display: "flex", 
          flexDirection: "column",
          gap: "2rem", 
          maxWidth: "1100px", 
          margin: "0 auto",
          width: "100%"
        }}>
          {/* Global Pattern Switcher */}
          <div className="island-quick-switcher" style={{ 
            display: "flex", 
            justifyContent: "center", 
            gap: "1rem", 
            padding: "1rem",
            background: "var(--bg-card)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border-subtle)"
          }}>
            {["v2", "v3", "v4"].map(vId => (
              <button 
                key={vId}
                className={`btn ${voronoiUploadId === vId ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setVoronoiUploadId(vId)}
                style={{ minWidth: "120px", textTransform: "uppercase", fontWeight: "700", letterSpacing: "1px" }}
              >
                Island {vId.toUpperCase()}
              </button>
            ))}
          </div>
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
                    className="mini-map-svg-container preview-scope"
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
                {availableCellIds.map(id => (
                  <div 
                    key={id} 
                    onClick={() => setVoronoiCellId(id.toString())}
                    style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      gap: "0.75rem", 
                      padding: "0.8rem 1rem", 
                      borderRadius: "var(--radius-sm)",
                      background: voronoiCellId === id.toString() ? "rgba(255, 96, 0, 0.15)" : "transparent",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      border: voronoiCellId === id.toString() ? "1px solid var(--accent)" : "1px solid transparent",
                      boxShadow: voronoiCellId === id.toString() ? "0 4px 12px rgba(0,0,0,0.2)" : "none",
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
                      color: isSpecial(voronoiUploadId, id) ? "var(--accent)" : (voronoiCells[id] ? "var(--text-primary)" : "var(--text-muted)"),
                      fontWeight: (voronoiCells[id] || isSpecial(voronoiUploadId, id)) ? "600" : "400",
                      overflow: "hidden", 
                      textOverflow: "ellipsis", 
                      whiteSpace: "nowrap",
                      fontStyle: isSpecial(voronoiUploadId, id) ? "italic" : "normal"
                    }}>
                      {isSpecial(voronoiUploadId, id) ? "Protected Branding Cell" : (voronoiCells[id]?.name || "Empty")}
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
                    {availableCellIds.map(n => (
                      <option key={n} value={n.toString()}>
                        {voronoiCells[n] ? "🟢" : "⚪"} Cell {n} {voronoiCells[n] ? `(${voronoiCells[n].name})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {isSpecial(voronoiUploadId, voronoiCellId) ? (
                <div style={{ padding: "1.5rem", background: "rgba(255, 96, 0, 0.1)", border: "1px solid var(--accent)", borderRadius: "var(--radius-sm)", color: "var(--accent)", fontWeight: "600", textAlign: "center" }}>
                  ⚠️ This is a protected branding cell and cannot be edited.
                </div>
              ) : (
                <>
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
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Author Name</label>
                    <input 
                      id="voronoi-cell-author-input"
                      type="text"
                      placeholder="e.g., John Doe..."
                      value={voronoiCellAuthor}
                      onChange={(e) => setVoronoiCellAuthor(e.target.value)}
                      style={{ width: "100%", padding: "0.85rem", borderRadius: "var(--radius-sm)", background: "var(--bg-input)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)", outline: "none" }}
                    />
                  </div>

                  <div className="input-group">
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Redirect URL (Webpage)</label>
                    <input 
                      id="voronoi-redirect-url-input"
                      type="url"
                      placeholder="https://example.com"
                      value={voronoiRedirectUrl}
                      onChange={(e) => setVoronoiRedirectUrl(e.target.value)}
                      style={{ width: "100%", padding: "0.85rem", borderRadius: "var(--radius-sm)", background: "var(--bg-input)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)", outline: "none" }}
                    />
                    {voronoiCells[voronoiCellId]?.redirectUrl && (
                      <p style={{ fontSize: "0.75rem", color: "var(--success)", marginTop: "0.4rem" }}>
                        ✓ Webpage redirect active.
                      </p>
                    )}
                    <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.4rem" }}>
                      If set, clicking the cell will redirect to this URL instead of opening a PDF preview.
                    </p>
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
                    {voronoiCells[voronoiCellId]?.url && (
                      <p style={{ fontSize: "0.75rem", color: "var(--success)", marginTop: "0.5rem" }}>
                        ✓ Existing document linked. Leave empty to keep it.
                      </p>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                    <button type="submit" className="btn btn-primary btn-lg" disabled={uploadingPdf} style={{ flex: 2, padding: "1.1rem", fontSize: "1rem" }}>
                      {uploadingPdf ? "Saving..." : voronoiFile ? "🚀 Upload PDF & Save" : "💾 Save Name Only"}
                    </button>
                    {voronoiCells[voronoiCellId] && (
                      <button 
                        type="button" 
                        className="btn btn-danger btn-lg" 
                        disabled={uploadingPdf} 
                        onClick={handleResetCell}
                        style={{ flex: 1, padding: "1.1rem", fontSize: "1rem" }}
                      >
                        🗑 Reset
                      </button>
                    )}
                  </div>
                </>
              )}
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
      <style jsx global>{`
        .preview-scope svg [id^='cell-'], 
        .preview-scope svg [data-cell] {
          fill: rgba(255, 255, 255, 0.1) !important;
          stroke: rgba(255, 255, 255, 0.2) !important;
          stroke-width: 1px !important;
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .preview-scope svg [id^='cell-']:hover, 
        .preview-scope svg [data-cell]:hover {
          fill: var(--accent) !important;
          stroke: white !important;
          opacity: 1 !important;
        }
        /* Highlight active cell */
        .preview-scope svg [data-active="true"] {
          fill: var(--accent) !important;
          stroke: white !important;
          stroke-width: 2.5px !important;
          opacity: 1 !important;
          filter: drop-shadow(0 0 10px var(--accent));
        }
      `}</style>
    </div>
  );
}
