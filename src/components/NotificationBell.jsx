import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { NotificationAPI } from "../api/api"

// Backend NotificationDTO:
//   { id, type, title, message, relatedRequestId, relatedPurchaseId, createdAt, readFlag }

/* ── Injected styles ── */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap');

.nb-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
}

/* ── Bell button ── */
.nb-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px; height: 38px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,.1);
  background: rgba(255,255,255,.05);
  cursor: pointer;
  position: relative;
  transition: background .15s, border-color .15s, transform .15s;
  padding: 0;
}
.nb-btn:hover {
  background: rgba(255,255,255,.1);
  border-color: rgba(255,255,255,.18);
  transform: scale(1.04);
}
.nb-btn:active { transform: scale(.97); }

.nb-bell-icon {
  font-size: 16px;
  line-height: 1;
  display: block;
  transition: transform .3s cubic-bezier(.34,1.56,.64,1);
}
.nb-btn:hover .nb-bell-icon { transform: rotate(12deg); }

/* unread badge */
.nb-badge {
  position: absolute;
  top: -4px; right: -4px;
  min-width: 18px; height: 18px;
  padding: 0 4px;
  border-radius: 999px;
  background: #ef4444;
  color: #fff;
  font-size: 10px; font-weight: 700;
  font-family: 'Outfit', sans-serif;
  display: flex; align-items: center; justify-content: center;
  line-height: 1;
  border: 2px solid #050e24;
  animation: badgePop .25s cubic-bezier(.34,1.56,.64,1) both;
}
@keyframes badgePop {
  from { transform: scale(0); opacity: 0; }
  to   { transform: scale(1); opacity: 1; }
}

/* ── Dropdown panel ── */
.nb-panel {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 360px;
  max-height: 480px;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  box-shadow:
    0 4px 6px rgba(0,0,0,.04),
    0 16px 40px rgba(0,0,0,.14),
    0 0 0 1px rgba(0,0,0,.03);
  z-index: 9999;
  overflow: hidden;
  animation: panelDrop .25s cubic-bezier(.22,.61,.36,1) both;
  font-family: 'Outfit', system-ui, sans-serif;
}
@keyframes panelDrop {
  from { opacity:0; transform:translateY(-10px) scale(.97); }
  to   { opacity:1; transform:none; }
}

/* panel header */
.nb-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px 12px;
  border-bottom: 1px solid #f1f5f9;
  flex-shrink: 0;
}

.nb-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nb-header-title {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -.2px;
}

.nb-header-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px; height: 20px;
  padding: 0 5px;
  border-radius: 999px;
  background: #ef4444;
  color: #fff;
  font-size: 10.5px;
  font-weight: 700;
  line-height: 1;
}

.nb-mark-all-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 11.5px;
  font-weight: 600;
  color: #3b82f6;
  padding: 4px 8px;
  border-radius: 6px;
  font-family: inherit;
  transition: background .15s, color .15s;
}
.nb-mark-all-btn:hover { background: #eff6ff; color: #1d4ed8; }

/* filter tabs */
.nb-tabs {
  display: flex;
  padding: 8px 12px 0;
  border-bottom: 1px solid #f1f5f9;
  gap: 4px;
  flex-shrink: 0;
}

.nb-tab {
  padding: 6px 12px;
  border-radius: 7px 7px 0 0;
  font-size: 11.5px;
  font-weight: 600;
  color: #94a3b8;
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  transition: color .15s, background .15s;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}
.nb-tab:hover { color: #475569; background: #f8fafc; }
.nb-tab.active { color: #1d4ed8; border-bottom-color: #3b82f6; background: none; }

/* scrollable body */
.nb-body {
  overflow-y: auto;
  flex: 1;
  scrollbar-width: thin;
  scrollbar-color: #e2e8f0 transparent;
}
.nb-body::-webkit-scrollbar { width: 4px; }
.nb-body::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 2px; }

/* empty state */
.nb-empty {
  padding: 40px 20px;
  text-align: center;
}
.nb-empty-icon { font-size: 32px; margin-bottom: 10px; line-height: 1; }
.nb-empty-text { font-size: 13px; color: #94a3b8; line-height: 1.55; }

/* notification item */
.nb-item {
  width: 100%;
  text-align: left;
  padding: 13px 18px;
  border: none;
  border-bottom: 1px solid #f8fafc;
  background: #fff;
  cursor: pointer;
  display: flex;
  align-items: flex-start;
  gap: 11px;
  transition: background .15s;
  font-family: inherit;
}
.nb-item:hover { background: #f8fafc; }
.nb-item.unread { background: #f0f9ff; }
.nb-item.unread:hover { background: #e0f2fe; }
.nb-item:last-child { border-bottom: none; }

/* type dot */
.nb-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 5px;
}

/* type icon circle */
.nb-type-icon {
  width: 34px; height: 34px;
  border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
  font-size: 15px;
  flex-shrink: 0;
}

.nb-item-body { flex: 1; min-width: 0; }

.nb-item-title {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.4;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.nb-item.unread .nb-item-title { font-weight: 700; }

.nb-item-msg {
  font-size: 12px;
  color: #64748b;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.nb-item-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 5px;
}

.nb-item-time {
  font-size: 10.5px;
  color: #94a3b8;
  font-weight: 500;
}

.nb-item-tag {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: .3px;
}

/* panel footer */
.nb-footer {
  padding: 10px 18px;
  border-top: 1px solid #f1f5f9;
  text-align: center;
  flex-shrink: 0;
}
.nb-footer-text {
  font-size: 11.5px;
  color: #94a3b8;
}

/* loading shimmer */
.nb-shimmer {
  padding: 14px 18px;
  display: flex;
  gap: 12px;
  align-items: center;
}
.nb-shimmer-icon {
  width: 34px; height: 34px;
  border-radius: 9px;
  background: #f1f5f9;
  animation: shimmer 1.5s infinite;
  flex-shrink: 0;
}
.nb-shimmer-lines { flex: 1; display: flex; flex-direction: column; gap: 7px; }
.nb-shimmer-line {
  height: 10px;
  border-radius: 4px;
  background: #f1f5f9;
  animation: shimmer 1.5s infinite;
}
.nb-shimmer-line.short { width: 55%; }
@keyframes shimmer {
  0%,100% { opacity: 1; }
  50%     { opacity: .45; }
}

@media (max-width: 480px) {
  .nb-panel { width: calc(100vw - 24px); right: -10px; }
}
`

/* ── Helpers ── */
function timeAgo(dateStr) {
  if (!dateStr) return ""
  const diff = Date.now() - new Date(dateStr).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60)   return "Just now"
  const m = Math.floor(s / 60)
  if (m < 60)   return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)   return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30)   return `${d}d ago`
  return new Date(dateStr).toLocaleDateString()
}

// Keys match backend NotificationType enum exactly
const TYPE_META = {
  // ── Equipment request workflow ────────────────────────────────
  REQUEST_SUBMITTED:           { icon: "📋", color: "#2563eb", bg: "rgba(37,99,235,.1)",   tag: "Submitted",   tc: "#2563eb", tb: "rgba(37,99,235,.1)"   },
  REQUEST_APPROVED:            { icon: "✅", color: "#16a34a", bg: "rgba(22,163,74,.1)",   tag: "Approved",    tc: "#16a34a", tb: "rgba(22,163,74,.1)"   },
  REQUEST_REJECTED:            { icon: "❌", color: "#dc2626", bg: "rgba(220,38,38,.1)",   tag: "Rejected",    tc: "#dc2626", tb: "rgba(220,38,38,.1)"   },

  // ── Issue workflow ────────────────────────────────────────────
  ISSUE_READY:                 { icon: "📦", color: "#7c3aed", bg: "rgba(124,58,237,.1)",  tag: "Ready",       tc: "#7c3aed", tb: "rgba(124,58,237,.1)"  },
  ISSUE_ACCEPTED:              { icon: "🤝", color: "#0891b2", bg: "rgba(8,145,178,.1)",   tag: "Confirmed",   tc: "#0891b2", tb: "rgba(8,145,178,.1)"   },
  TO_WAIT:                     { icon: "⏸", color: "#d97706", bg: "rgba(217,119,6,.1)",   tag: "On Hold",     tc: "#d97706", tb: "rgba(217,119,6,.1)"   },

  // ── Return workflow ───────────────────────────────────────────
  RETURN_SUBMITTED:            { icon: "↩️",  color: "#7c3aed", bg: "rgba(124,58,237,.1)",  tag: "Return",      tc: "#7c3aed", tb: "rgba(124,58,237,.1)"  },
  RETURN_VERIFIED:             { icon: "☑️",  color: "#16a34a", bg: "rgba(22,163,74,.1)",   tag: "Verified",    tc: "#16a34a", tb: "rgba(22,163,74,.1)"   },
  DAMAGE_REPORTED:             { icon: "⚠️",  color: "#dc2626", bg: "rgba(220,38,38,.1)",   tag: "Damaged",     tc: "#dc2626", tb: "rgba(220,38,38,.1)"   },

  // ── Purchase workflow ─────────────────────────────────────────
  PURCHASE_SUBMITTED:          { icon: "🛒", color: "#0891b2", bg: "rgba(8,145,178,.1)",   tag: "Purchase",    tc: "#0891b2", tb: "rgba(8,145,178,.1)"   },
  PURCHASE_APPROVED_BY_HOD:    { icon: "✅", color: "#16a34a", bg: "rgba(22,163,74,.1)",   tag: "HOD Approved",tc: "#16a34a", tb: "rgba(22,163,74,.1)"   },
  PURCHASE_REJECTED_BY_HOD:    { icon: "❌", color: "#dc2626", bg: "rgba(220,38,38,.1)",   tag: "HOD Rejected",tc: "#dc2626", tb: "rgba(220,38,38,.1)"   },
  PURCHASE_APPROVED_BY_ADMIN:  { icon: "🏛️", color: "#16a34a", bg: "rgba(22,163,74,.1)",   tag: "Admin Issued",tc: "#16a34a", tb: "rgba(22,163,74,.1)"   },
  PURCHASE_REJECTED_BY_ADMIN:  { icon: "🏛️", color: "#dc2626", bg: "rgba(220,38,38,.1)",   tag: "Admin Rejected",tc: "#dc2626",tb: "rgba(220,38,38,.1)"   },
  PURCHASE_RECEIVED_BY_HOD:   { icon: "📦", color: "#16a34a", bg: "rgba(22,163,74,.1)",   tag: "Received",    tc: "#16a34a", tb: "rgba(22,163,74,.1)"   },

  DEFAULT:                     { icon: "🔔", color: "#64748b", bg: "rgba(100,116,139,.1)",  tag: "Info",        tc: "#64748b", tb: "rgba(100,116,139,.1)"  },
}

function getMeta(type) {
  return TYPE_META[type] || TYPE_META.DEFAULT
}

export default function NotificationBell() {
  const [open,    setOpen]    = useState(false)
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(false)
  const [filter,  setFilter]  = useState("all")   // "all" | "unread"
  const timerRef              = useRef(null)
  const dropRef               = useRef(null)

  const unreadCount = useMemo(() => items.filter(n => !n.readFlag).length, [items])

  const load = useCallback(async (showLoader = false) => {
    const token = localStorage.getItem("token")
    if (!token) return
    if (showLoader) setLoading(true)
    try {
      const data = await NotificationAPI.my()
      const sorted = Array.isArray(data)
        ? [...data].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        : []
      setItems(sorted)
    } catch { /* silent */ }
    finally { if (showLoader) setLoading(false) }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) return
    load()
    timerRef.current = setInterval(() => load(), 20000)
    return () => clearInterval(timerRef.current)
  }, [load])

  // close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const markRead = async (n) => {
    if (n.readFlag) return
    try {
      await NotificationAPI.markRead(n.id)
      setItems(prev => prev.map(x => x.id === n.id ? { ...x, readFlag: true } : x))
    } catch { /* silent */ }
  }

  const markAllRead = async () => {
    const unread = items.filter(n => !n.readFlag)
    await Promise.allSettled(unread.map(n => NotificationAPI.markRead(n.id)))
    setItems(prev => prev.map(x => ({ ...x, readFlag: true })))
  }

  const displayed = filter === "unread" ? items.filter(n => !n.readFlag) : items

  return (
    <div ref={dropRef} className="nb-wrap">
      <style>{css}</style>

      {/* Bell button */}
      <button
        type="button"
        className="nb-btn"
        onClick={() => {
          const next = !open
          setOpen(next)
          if (next) load(true)
        }}
        aria-label={`Notifications${unreadCount > 0 ? ` · ${unreadCount} unread` : ""}`}
      >
        <span className="nb-bell-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="nb-badge">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="nb-panel">

          {/* Header */}
          <div className="nb-header">
            <div className="nb-header-left">
              <span className="nb-header-title">Notifications</span>
              {unreadCount > 0 && (
                <span className="nb-header-count">{unreadCount}</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button className="nb-mark-all-btn" onClick={markAllRead}>
                Mark all read
              </button>
            )}
          </div>

          {/* Filter tabs */}
          <div className="nb-tabs">
            <button
              className={`nb-tab${filter === "all" ? " active" : ""}`}
              onClick={() => setFilter("all")}
            >
              All ({items.length})
            </button>
            <button
              className={`nb-tab${filter === "unread" ? " active" : ""}`}
              onClick={() => setFilter("unread")}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Body */}
          <div className="nb-body">
            {loading && (
              <>
                {[1,2,3].map(i => (
                  <div className="nb-shimmer" key={i}>
                    <div className="nb-shimmer-icon" />
                    <div className="nb-shimmer-lines">
                      <div className="nb-shimmer-line" />
                      <div className="nb-shimmer-line short" />
                    </div>
                  </div>
                ))}
              </>
            )}

            {!loading && displayed.length === 0 && (
              <div className="nb-empty">
                <div className="nb-empty-icon">
                  {filter === "unread" ? "✓" : "🔔"}
                </div>
                <div className="nb-empty-text">
                  {filter === "unread"
                    ? "You're all caught up — no unread notifications."
                    : "No notifications yet. Updates will appear here."
                  }
                </div>
              </div>
            )}

            {!loading && displayed.map(n => {
              const meta = getMeta(n.type)
              return (
                <button
                  key={n.id}
                  type="button"
                  className={`nb-item${!n.readFlag ? " unread" : ""}`}
                  onClick={() => markRead(n)}
                >
                  {/* type icon */}
                  <div
                    className="nb-type-icon"
                    style={{ background: meta.bg, border: `1px solid ${meta.color}22` }}
                  >
                    {meta.icon}
                  </div>

                  <div className="nb-item-body">
                    <div className="nb-item-title">{n.title || "Notification"}</div>
                    {n.message && (
                      <div className="nb-item-msg">{n.message}</div>
                    )}
                    <div className="nb-item-footer">
                      <span className="nb-item-time">{timeAgo(n.createdAt)}</span>
                      <span
                        className="nb-item-tag"
                        style={{ color: meta.tc, background: meta.tb }}
                      >
                        {meta.tag}
                      </span>
                    </div>
                  </div>

                  {/* unread dot */}
                  {!n.readFlag && (
                    <div
                      className="nb-dot"
                      style={{ background: "#3b82f6", boxShadow: "0 0 5px rgba(59,130,246,.5)" }}
                    />
                  )}
                </button>
              )
            })}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="nb-footer">
              <span className="nb-footer-text">
                {items.length} notification{items.length !== 1 ? "s" : ""} total
                {unreadCount > 0 ? ` · ${unreadCount} unread` : " · All read"}
              </span>
            </div>
          )}

        </div>
      )}
    </div>
  )
}