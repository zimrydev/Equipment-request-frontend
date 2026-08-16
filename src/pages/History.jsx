import "../styles/studentTheme.css"
import { useEffect, useMemo, useState } from "react"
import Sidebar from "../components/Sidebar"
import Topbar from "../components/Topbar"
import { StudentRequestAPI } from "../api/api"
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts"

/*
  History shows items that have reached a terminal state (per RequestItemStatus):
    REJECTED_BY_LECTURER   — item was rejected by lecturer
    RETURN_VERIFIED        — RETURNABLE item returned and verified by TO
    DAMAGED_REPORTED       — returned but marked damaged by TO

  Tabs: All / Returned / Damaged / Rejected
  Charts: Pie (outcome breakdown) · Bar (most used equipment)
*/

/* ── Helpers ── */
function itemSpClass(s) {
  switch (String(s || "").toUpperCase()) {
    case "REJECTED_BY_LECTURER": return "st-sp st-sp-rejected"
    case "RETURN_VERIFIED":      return "st-sp st-sp-returned"
    case "DAMAGED_REPORTED":     return "st-sp st-sp-damaged"
    default:                     return "st-sp st-sp-slate"
  }
}
function itemStatusLabel(s) {
  switch (String(s || "").toUpperCase()) {
    case "REJECTED_BY_LECTURER": return "Rejected by Lecturer"
    case "RETURN_VERIFIED":      return "Returned & Verified"
    case "DAMAGED_REPORTED":     return "Damaged"
    default: return String(s || "").replace(/_/g, " ") || "—"
  }
}

const HISTORY_STATUSES = new Set(["REJECTED_BY_LECTURER", "RETURN_VERIFIED", "DAMAGED_REPORTED"])

const TABS = [
  { id: "all",      label: "All" },
  { id: "returned", label: "Returned" },
  { id: "damaged",  label: "Damaged" },
  { id: "rejected", label: "Rejected" },
]

const PIE_COLORS = ["#64748b", "#16a34a", "#dc2626", "#d97706", "#4f46e5"]

export default function History() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState("")
  const [tab,     setTab]     = useState("all")
  const [search,  setSearch]  = useState("")

  useEffect(() => {
    const load = async () => {
      setError("")
      try {
        setLoading(true)
        const list = await StudentRequestAPI.my()
        setRows(Array.isArray(list) ? list : [])
      } catch (e) {
        setError(e?.message || "Failed to load history")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  /* ── Flatten to per-item history rows ── */
  const historyFlat = useMemo(() => {
    const out = []
    for (const r of rows) {
      for (const it of (Array.isArray(r.items) ? r.items : [])) {
        if (!HISTORY_STATUSES.has(String(it.itemStatus || "").toUpperCase())) continue
        out.push({ ...r, _item: it })
      }
    }
    return out.sort((a, b) => (b.requestId || 0) - (a.requestId || 0))
  }, [rows])

  /* ── Tab filter ── */
  const tabFiltered = useMemo(() => {
    if (tab === "all")      return historyFlat
    if (tab === "returned") return historyFlat.filter(r => String(r._item.itemStatus).toUpperCase() === "RETURN_VERIFIED")
    if (tab === "damaged")  return historyFlat.filter(r => String(r._item.itemStatus).toUpperCase() === "DAMAGED_REPORTED")
    if (tab === "rejected") return historyFlat.filter(r => String(r._item.itemStatus).toUpperCase() === "REJECTED_BY_LECTURER")
    return historyFlat
  }, [historyFlat, tab])

  /* ── Search filter ── */
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return tabFiltered
    return tabFiltered.filter(r =>
      String(r.requestId).includes(q) ||
      (r.labName || "").toLowerCase().includes(q) ||
      (r.lecturerName || "").toLowerCase().includes(q) ||
      (r._item.equipmentName || "").toLowerCase().includes(q)
    )
  }, [tabFiltered, search])

  /* ── Pie: outcome distribution ── */
  const pieData = useMemo(() => {
    const map = {}
    for (const r of historyFlat) {
      const label = itemStatusLabel(r._item.itemStatus)
      map[label] = (map[label] || 0) + 1
    }
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [historyFlat])

  /* ── Bar: most borrowed equipment ── */
  const equipBarData = useMemo(() => {
    const map = {}
    for (const r of historyFlat) {
      const name = r._item.equipmentName || `Equipment #${r._item.equipmentId}`
      map[name] = (map[name] || 0) + 1
    }
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a).slice(0, 8)
      .map(([name, count]) => ({
        name: name.length > 13 ? name.slice(0, 13) + "…" : name, count,
      }))
  }, [historyFlat])

  const tabCount = (id) => {
    if (id === "all")      return historyFlat.length
    if (id === "returned") return historyFlat.filter(r => String(r._item.itemStatus).toUpperCase() === "RETURN_VERIFIED").length
    if (id === "damaged")  return historyFlat.filter(r => String(r._item.itemStatus).toUpperCase() === "DAMAGED_REPORTED").length
    if (id === "rejected") return historyFlat.filter(r => String(r._item.itemStatus).toUpperCase() === "REJECTED_BY_LECTURER").length
    return 0
  }

  return (
    <div className="dashboard-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <div className="content">

          {/* Page Header */}
          <div className="st-page-header">
            <div className="st-page-header-left">
              <div className="st-page-title">Request History</div>
              <div className="st-page-subtitle">
                Completed, returned, damaged, and rejected equipment items
              </div>
            </div>
          </div>

          {error && <div className="st-alert st-alert-error">{error}</div>}

          {loading ? (
            <div className="st-empty">
              <div className="st-empty-icon">⏳</div>
              <div className="st-empty-text">Loading history…</div>
            </div>
          ) : (
            <>
              {/* Charts */}
              {(pieData.length > 0 || equipBarData.length > 0) && (
                <div className="st-chart-grid-2" style={{ marginBottom: 28 }}>
                  {pieData.length > 0 && (
                    <div className="st-chart-card">
                      <div className="st-chart-title">Outcome Breakdown</div>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" outerRadius={74} dataKey="value">
                            {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                          <Legend iconSize={10} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  {equipBarData.length > 0 && (
                    <div className="st-chart-card">
                      <div className="st-chart-title">Most Borrowed Equipment</div>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={equipBarData} layout="vertical" margin={{ top: 4, right: 20, left: 0, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                          <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#4f46e5" radius={[0, 4, 4, 0]} name="Times" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              )}

              {/* Tabs */}
              <div className="st-tab-bar">
                {TABS.map(t => (
                  <button
                    key={t.id}
                    className={`st-tab-item${tab === t.id ? " active" : ""}`}
                    onClick={() => { setTab(t.id); setSearch("") }}
                  >
                    {t.label}
                    <span style={{
                      marginLeft: 6, fontSize: 11, fontWeight: 700,
                      background: tab === t.id ? "var(--st-indigo-pale)" : "var(--st-slate-200)",
                      color: tab === t.id ? "var(--st-indigo)" : "var(--st-slate-600)",
                      padding: "1px 6px", borderRadius: 10,
                    }}>
                      {tabCount(t.id)}
                    </span>
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="st-filter-bar">
                <div className="st-filter-wrap">
                  <span className="st-filter-icon">🔍</span>
                  <input
                    className="st-filter-input"
                    placeholder="Search by ID, equipment, lab, lecturer…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
              </div>

              {/* Empty state */}
              {filtered.length === 0 && (
                <div className="st-empty">
                  <div className="st-empty-icon">{tab === "rejected" ? "❌" : "📋"}</div>
                  <div className="st-empty-text">
                    {search
                      ? "No records match your search"
                      : tab === "all"
                        ? "No history records yet"
                        : `No ${tab} records yet`
                    }
                  </div>
                </div>
              )}

              {/* History Cards */}
              {filtered.map(r => {
                const it = r._item
                return (
                  <div key={`${r.requestId}-${it.requestItemId}`} className="st-card">
                    <div className="st-card-top">
                      <div className="st-card-title">
                        <span style={{ color: "var(--st-indigo)", fontWeight: 800 }}>#{r.requestId}</span>
                        <span style={{ color: "var(--st-text-muted)", fontWeight: 400 }}>·</span>
                        <span>{it.equipmentName || `Equipment #${it.equipmentId}`}</span>
                        {r.purpose && (
                          <span className={`st-purpose ${String(r.purpose).toLowerCase()}`}>
                            {r.purpose}
                          </span>
                        )}
                      </div>
                      <span className={itemSpClass(it.itemStatus)}>
                        {itemStatusLabel(it.itemStatus)}
                      </span>
                    </div>

                    <div className="st-card-body">
                      <div className="st-meta-grid">
                        <div>
                          <div className="st-mi-label">Lab</div>
                          <div className="st-mi-value">{r.labName || "—"}</div>
                        </div>
                        <div>
                          <div className="st-mi-label">Lecturer</div>
                          <div className="st-mi-value muted">{r.lecturerName || "—"}</div>
                        </div>
                        <div>
                          <div className="st-mi-label">Period</div>
                          <div className="st-mi-value muted">
                            {r.fromDate || "—"} → {r.toDate || "—"}
                          </div>
                        </div>
                        <div>
                          <div className="st-mi-label">Requested Qty</div>
                          <div className="st-mi-value">{it.quantity ?? "—"}</div>
                        </div>
                        {it.issuedQty != null && (
                          <div>
                            <div className="st-mi-label">Issued Qty</div>
                            <div className="st-mi-value">{it.issuedQty}</div>
                          </div>
                        )}
                        {it.itemType && (
                          <div>
                            <div className="st-mi-label">Item Type</div>
                            <div className="st-mi-value muted">{it.itemType}</div>
                          </div>
                        )}
                        {it.returned != null && String(it.itemType || "").toUpperCase() === "RETURNABLE" && (
                          <div>
                            <div className="st-mi-label">Returned</div>
                            <div className="st-mi-value" style={{ color: it.returned ? "var(--st-green)" : "var(--st-text-muted)" }}>
                              {it.returned ? "Yes" : "No"}
                            </div>
                          </div>
                        )}
                        {it.damaged != null && (
                          <div>
                            <div className="st-mi-label">Damaged</div>
                            <div className="st-mi-value" style={{ color: it.damaged ? "var(--st-red)" : "var(--st-green)" }}>
                              {it.damaged ? "Yes" : "No"}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </>
          )}

        </div>
      </div>
    </div>
  )
}