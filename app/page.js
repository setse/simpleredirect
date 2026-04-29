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

  // ── Toast helper ──────────────────────────
  const showToast = useCallback((message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
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
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    setLoading(true);

    try {
      const res = await fetch("/api/links", {
        headers: { "x-admin-password": password },
      });

      if (res.ok) {
        setAuthenticated(true);
        const data = await res.json();
        setLinks(data.links || {});
        setScans(data.scans || {});
      } else {
        setLoginError("Incorrect password. Please try again.");
      }
    } catch (err) {
      setLoginError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
          <div className="dashboard-title-icon">📱</div>
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
            }}
          >
            Sign Out
          </button>
        </div>
      </header>

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

      {/* Toast Notifications */}
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
