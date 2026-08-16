import "../styles/toTheme.css"
import Sidebar from "../components/Sidebar"
import Topbar from "../components/Topbar"
import { useEffect, useMemo, useState } from "react"
import { ToRequestAPI } from "../api/api"

/* ── Status pill helper ── */
function itemSpClass(s) {
  if (!s) return "to-sp to-sp-slate"
  switch (s) {
    case "PENDING_LECTURER_APPROVAL":       return "to-sp to-sp-pending"
    case "APPROVED_BY_LECTURER":            return "to-sp to-sp-approved"
    case "REJECTED_BY_LECTURER":            return "to-sp to-sp-rejected"
    case "WAITING_TO_ISSUE":                return "to-sp to-sp-waiting"
    case "ISSUED_PENDING_REQUESTER_ACCEPT": return "to-sp to-sp-issued"
    case "ISSUED_CONFIRMED":                return "to-sp to-sp-confirmed"
    case "RETURN_REQUESTED":                return "to-sp to-sp-return-req"
    case "RETURN_VERIFIED":                 return "to-sp to-sp-returned"
    case "DAMAGED_REPORTED":                return "to-sp to-sp-damaged"
    default:                                return "to-sp to-sp-slate"
  }
}

function itemStatusLabel(s) {
  if (!s) return "—"
  return s.replace(/_/g, " ")
}

/* ── Per-item action state ── */
function useItemActions(reload) {
  const [busy, setBusy] = useState({})      // itemId → true while processing
  const [waitOpen, setWaitOpen] = useState({}) // itemId → true when wait panel open
  const [waitReason, setWaitReason] = useState({}) // itemId → string
  const [itemError, setItemError] = useState({}) // itemId → error string

  const act = async (itemId, fn) => {
    setBusy(p => ({ ...p, [itemId]: true }))
    setItemError(p => ({ ...p, [itemId]: "" }))
    try {
      await fn()
      await reload()
    } catch (e) {
      setItemError(p => ({ ...p, [itemId]: e?.message || "Action failed" }))
    } finally {
      setBusy(p => ({ ...p, [itemId]: false }))
    }
  }

  const issue = (itemId) => act(itemId, () => ToRequestAPI.issueItem(itemId))

  const openWait = (itemId) => setWaitOpen(p => ({ ...p, [itemId]: true }))
  const closeWait = (itemId) => {
    setWaitOpen(p => ({ ...p, [itemId]: false }))
    setWaitReason(p => ({ ...p, [itemId]: "" }))
  }
  const submitWait = (itemId) => {
    const reason = (waitReason[itemId] || "").trim()
    act(itemId, () => ToRequestAPI.waitItem(itemId, reason))
    closeWait(itemId)
  }

  const verifyOk     = (itemId) => act(itemId, () => ToRequestAPI.verifyReturnItem(itemId, false))
  const verifyDamage = (itemId) => act(itemId, () => ToRequestAPI.verifyReturnItem(itemId, true))

  return { busy, waitOpen, waitReason, setWaitReason, itemError, issue, openWait, closeWait, submitWait, verifyOk, verifyDamage }
}

/* ── Which items the TO can act on ── */
// Issue is available when item is APPROVED_BY_LECTURER OR WAITING_TO_ISSUE (re-issue attempt)
const canIssue = (s) => s === "APPROVED_BY_LECTURER" || s === "WAITING_TO_ISSUE"
const canWait  = (s) => s === "APPROVED_BY_LECTURER"
const canVerifyReturn = (s) => s === "RETURN_REQUESTED"

/* ── Filter options ── */
const STATUS_FILTERS = [
  { value: "all",          label: "All Statuses" },
  { value: "APPROVED_BY_LECTURER",            label: "Ready to Issue" },
  { value: "WAITING_TO_ISSUE",                label: "Waiting" },
  { value: "ISSUED_PENDING_REQUESTER_ACCEPT", label: "Issued (Pending Accept)" },
  { value: "ISSUED_CONFIRMED",                label: "Confirmed" },
  { value: "RETURN_REQUESTED",                label: "Return Requested" },
]


/* ── Priority badge ── */
function PriorityBadge({ score }) {
  if (score == null) return null
  let color = "#64748b", bg = "rgba(100,116,139,.12)", label = "Low"
  if (score >= 80) { color = "#dc2626"; bg = "rgba(220,38,38,.12)"; label = "Critical" }
  else if (score >= 60) { color = "#d97706"; bg = "rgba(217,119,6,.12)"; label = "High" }
  else if (score >= 40) { color = "#2563eb"; bg = "rgba(37,99,235,.12)"; label = "Medium" }
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 8px", borderRadius: 6,
      background: bg, color, fontSize: 11, fontWeight: 700,
      border: `1px solid ${color}22`
    }}>
      🎯 {label} {score}
    </span>
  )
}

export default function TOApprovalRequests() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  const load = async () => {
    setError("")
    try {
      setLoading(true)
      const list = await ToRequestAPI.all()
      setRows(Array.isArray(list) ? list : [])
    } catch (e) {
      setError(e?.message || "Failed to load requests")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const actions = useItemActions(load)

  /* Flatten to item rows — show only actionable or in-progress items */
  const SHOW_STATUSES = new Set([
    "APPROVED_BY_LECTURER",
    "WAITING_TO_ISSUE",
    "ISSUED_PENDING_REQUESTER_ACCEPT",
    "ISSUED_CONFIRMED",
    "RETURN_REQUESTED",
  ])

  const flatRows = useMemo(() => {
    const out = []
    for (const r of rows) {
      for (const it of (r.items || [])) {
        if (!SHOW_STATUSES.has(it.itemStatus)) continue
        out.push({ ...r, _item: it })
      }
    }

    /*
     * Two-tier sort:
     *
     * TIER 1 — "Pending" items (TO has not yet acted):
     *   APPROVED_BY_LECTURER → sorted by priority score DESC
     *   (highest urgency shown first so TO issues the most critical request first)
     *
     * TIER 2 — "In-progress" items (TO already acted, waiting on someone else):
     *   Shown below all pending items, sorted by workflow stage so TO
     *   can quickly see what needs attention next:
     *     RETURN_REQUESTED         → 1st  (needs TO verification now)
     *     WAITING_TO_ISSUE         → 2nd  (TO put on hold — may need revisiting)
     *     ISSUED_PENDING_REQUESTER_ACCEPT → 3rd (waiting on requester)
     *     ISSUED_CONFIRMED         → 4th  (fully active, no TO action needed)
     */
    const STAGE_ORDER = {
      APPROVED_BY_LECTURER:             0,   // Tier 1 — pending (sorted by priority within)
      RETURN_REQUESTED:                 1,   // Tier 2 — needs TO action
      WAITING_TO_ISSUE:                 2,   // Tier 2 — TO on hold
      ISSUED_PENDING_REQUESTER_ACCEPT:  3,   // Tier 2 — waiting on requester
      ISSUED_CONFIRMED:                 4,   // Tier 2 — completed, monitoring only
    }

    return out.sort((a, b) => {
      const sa = STAGE_ORDER[a._item.itemStatus] ?? 99
      const sb = STAGE_ORDER[b._item.itemStatus] ?? 99

      // Different tiers → put lower stage number first
      if (sa !== sb) return sa - sb

      // Both are APPROVED_BY_LECTURER (Tier 1) → sort by priority score DESC
      if (a._item.itemStatus === "APPROVED_BY_LECTURER") {
        const pa = b.priorityScore ?? 0
        const pb = a.priorityScore ?? 0
        if (pa !== pb) return pa - pb
      }

      // Same tier, same status → earlier request first (stable order)
      return (a.requestId || 0) - (b.requestId || 0)
    })
  }, [rows])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return flatRows.filter(r => {
      const matchSearch = !q ||
        String(r.requestId).includes(q) ||
        (r.requesterFullName || "").toLowerCase().includes(q) ||
        (r.requesterRegNo || "").toLowerCase().includes(q) ||
        (r.labName || "").toLowerCase().includes(q) ||
        (r._item.equipmentName || "").toLowerCase().includes(q)
      const matchStatus = statusFilter === "all" || r._item.itemStatus === statusFilter
      return matchSearch && matchStatus
    })
  }, [flatRows, search, statusFilter])

  return (
    <div className="dashboard-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <div className="content">

          <div className="to-page-header">
            <div>
              <div className="to-page-title">Approval Requests</div>
              <div className="to-page-subtitle">Issue equipment, mark as waiting, or verify returns</div>
            </div>
            <div style={{ fontSize: 13, color: "var(--to-text-muted)", fontWeight: 600 }}>
              {filtered.length} item{filtered.length !== 1 ? "s" : ""}
            </div>
          </div>

          {error && <div className="to-alert to-alert-error">{error}</div>}

          {/* Filters */}
          <div className="to-filter-bar">
            <div className="to-filter-wrap">
              <span className="to-filter-icon">🔍</span>
              <input
                className="to-filter-input"
                placeholder="Search by ID, requester, lab, equipment…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select
              className="to-filter-select"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              {STATUS_FILTERS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {loading && (
            <div className="to-empty">
              <div className="to-empty-icon">⏳</div>
              <div className="to-empty-text">Loading requests…</div>
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="to-empty">
              <div className="to-empty-icon">📭</div>
              <div className="to-empty-text">No requests match the current filters</div>
            </div>
          )}

          {!loading && filtered.map((r) => {
            const it = r._item
            const itemId = it.requestItemId
            const showWait = actions.waitOpen[itemId]
            const isBusy = actions.busy[itemId]
            const err = actions.itemError[itemId]

            return (
              <div key={`${r.requestId}-${itemId}`} className="to-card">
                {/* Card Header */}
                <div className="to-card-top">
                  <div>
                    <div className="to-card-title">
                      <span style={{ color: "var(--to-blue)", fontWeight: 800 }}>#{r.requestId}</span>
                      <span style={{ fontWeight: 400, fontSize: 13, color: "var(--to-text-muted)" }}>·</span>
                      <span>{it.equipmentName || `Equipment #${it.equipmentId}`}</span>
                      {it.itemStatus === "APPROVED_BY_LECTURER" && <PriorityBadge score={r.priorityScore} />}
                    </div>
                    <div style={{ marginTop: 3, fontSize: 12, color: "var(--to-text-muted)" }}>
                      {r.requesterFullName || r.requesterRegNo || "Unknown"} · {r.requesterRole || "—"}
                    </div>
                  </div>
                  <span className={itemSpClass(it.itemStatus)}>
                    {itemStatusLabel(it.itemStatus)}
                  </span>
                </div>

                {/* Card Body */}
                <div className="to-card-body">
                  <div className="to-meta-grid">
                    <div>
                      <div className="to-mi-label">Requester</div>
                      <div className="to-mi-value">{r.requesterFullName || "—"}</div>
                    </div>
                    <div>
                      <div className="to-mi-label">Reg / ID</div>
                      <div className="to-mi-value">{r.requesterRegNo || "—"}</div>
                    </div>
                    <div>
                      <div className="to-mi-label">Lab</div>
                      <div className="to-mi-value">{r.labName || "—"}</div>
                    </div>
                    <div>
                      <div className="to-mi-label">Purpose</div>
                      <div className="to-mi-value">{r.purpose || "—"}</div>
                    </div>
                    <div>
                      <div className="to-mi-label">From → To</div>
                      <div className="to-mi-value">{r.fromDate || "—"} → {r.toDate || "—"}</div>
                    </div>
                    <div>
                      <div className="to-mi-label">Qty</div>
                      <div className="to-mi-value">{it.quantity ?? "—"}</div>
                    </div>
                    <div>
                      <div className="to-mi-label">Item Type</div>
                      <div className="to-mi-value">{it.itemType || "—"}</div>
                    </div>
                    {it.issuedQty != null && (
                      <div>
                        <div className="to-mi-label">Issued Qty</div>
                        <div className="to-mi-value">{it.issuedQty}</div>
                      </div>
                    )}
                    {it.toWaitReason && (
                      <div style={{ gridColumn: "1/-1" }}>
                        <div className="to-mi-label">Wait Reason</div>
                        <div className="to-mi-value" style={{ color: "var(--to-purple)" }}>{it.toWaitReason}</div>
                      </div>
                    )}
                  </div>

                  {err && <div className="to-alert to-alert-error" style={{ marginBottom: 10 }}>{err}</div>}

                  {/* Action Buttons */}
                  <div className="to-card-actions">
                    {canIssue(it.itemStatus) && (
                      <button
                        className="to-btn to-btn-success to-btn-sm"
                        onClick={() => actions.issue(itemId)}
                        disabled={isBusy}
                      >
                        ✓ Issue
                      </button>
                    )}
                    {canWait(it.itemStatus) && !showWait && (
                      <button
                        className="to-btn to-btn-amber to-btn-sm"
                        onClick={() => actions.openWait(itemId)}
                        disabled={isBusy}
                      >
                        ⏸ Mark as Waiting
                      </button>
                    )}
                    {canVerifyReturn(it.itemStatus) && (
                      <>
                        <button
                          className="to-btn to-btn-success to-btn-sm"
                          onClick={() => actions.verifyOk(itemId)}
                          disabled={isBusy}
                        >
                          ✓ Verify Return (OK)
                        </button>
                        <button
                          className="to-btn to-btn-danger to-btn-sm"
                          onClick={() => actions.verifyDamage(itemId)}
                          disabled={isBusy}
                        >
                          ⚠ Mark Damaged
                        </button>
                      </>
                    )}
                  </div>

                  {/* Inline Wait Reason Panel — no window.prompt */}
                  {showWait && (
                    <div className="to-wait-panel">
                      <input
                        className="to-wait-input"
                        placeholder="Reason for waiting (optional)…"
                        value={actions.waitReason[itemId] || ""}
                        onChange={e => actions.setWaitReason(p => ({ ...p, [itemId]: e.target.value }))}
                        autoFocus
                      />
                      <button
                        className="to-btn to-btn-amber to-btn-sm"
                        onClick={() => actions.submitWait(itemId)}
                        disabled={isBusy}
                      >
                        Confirm Wait
                      </button>
                      <button
                        className="to-btn to-btn-ghost to-btn-sm"
                        onClick={() => actions.closeWait(itemId)}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

        </div>
      </div>
    </div>
  )
}