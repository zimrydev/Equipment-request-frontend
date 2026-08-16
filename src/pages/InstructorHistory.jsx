import "../styles/instructorTheme.css"
import { useEffect, useMemo, useState } from "react"
import Sidebar from "../components/Sidebar"
import Topbar from "../components/Topbar"
import { StudentRequestAPI } from "../api/api"
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts"

/*
  History shows items that have reached a terminal or near-terminal state:
    REJECTED_BY_LECTURER    — request was rejected
    RETURN_VERIFIED         — equipment returned and verified by TO
    DAMAGED_REPORTED        — equipment returned damaged

  Tabs:
    All     — everything in the above set
    Returned — RETURN_VERIFIED
    Damaged  — DAMAGED_REPORTED
    Rejected — REJECTED_BY_LECTURER

  Charts:
    Pie: outcome breakdown
    Bar: most frequently requested equipment
*/

/* ── Item status helpers ── */
function itemSpClass(s) {
  if (!s) return "inst-sp inst-sp-slate"
  switch (String(s).toUpperCase()) {
    case "REJECTED_BY_LECTURER": return "inst-sp inst-sp-rejected"
    case "RETURN_VERIFIED":      return "inst-sp inst-sp-returned"
    case "DAMAGED_REPORTED":     return "inst-sp inst-sp-damaged"
    default:                     return "inst-sp inst-sp-slate"
  }
}

function itemStatusLabel(s) {
  switch (String(s || "").toUpperCase()) {
    case "REJECTED_BY_LECTURER": return "Rejected by Lecturer"
    case "RETURN_VERIFIED":      return "Returned & Verified"
    case "DAMAGED_REPORTED":     return "Damaged"
    default:                     return String(s || "").replace(/_/g, " ")
  }
}

/* ── Request status helpers ── */
function reqSpClass(s) {
  if (!s) return "inst-sp inst-sp-slate"
  const u = String(s).toUpperCase()
  if (u === "REJECTED_BY_LECTURER")                           return "inst-sp inst-sp-rejected"
  if (u === "RETURNED_VERIFIED" || u === "DAMAGED_REPORTED")  return "inst-sp inst-sp-returned"
  return "inst-sp inst-sp-slate"
}

function reqStatusLabel(s) {
  const u = String(s || "").toUpperCase()
  if (u === "REJECTED_BY_LECTURER")  return "Rejected"
  if (u === "RETURNED_VERIFIED")     return "Returned"
  if (u === "DAMAGED_REPORTED")      return "Damaged"
  return String(s || "").replace(/_/g, " ")
}

/* History item statuses */
const HISTORY_STATUSES = new Set([
  "REJECTED_BY_LECTURER",
  "RETURN_VERIFIED",
  "DAMAGED_REPORTED",
])

const TABS = [
  { id: "all",      label: "All" },
  { id: "returned", label: "Returned" },
  { id: "damaged",  label: "Damaged" },
  { id: "rejected", label: "Rejected" },
]

const PIE_COLORS = ["#64748b", "#16a34a", "#dc2626", "#d97706", "#0d9488"]

export default function InstructorHistory() {
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

  /* ── Search ── */
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

  /* ── Pie: outcome breakdown ── */
  const pieData = useMemo(() => {
    const map = {}
    for (const r of historyFlat) {
      const label = itemStatusLabel(r._item.itemStatus)
      map[label] = (map[label] || 0) + 1
    }
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [historyFlat])

  /* ── Bar: most requested equipment in history ── */
  const equipBarData = useMemo(() => {
    const map = {}
    for (const r of historyFlat) {
      const name = r._item.equipmentName || `Equipment #${r._item.equipmentId}`
      map[name] = (map[name] || 0) + 1
    }
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
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
          <div className="inst-page-header">
            <div className="inst-page-header-left">
              <div className="inst-page-title">History</div>
              <div className="inst-page-subtitle">Completed, returned, damaged, and rejected equipment items</div>
            </div>
          </div>

          {error && <div className="inst-alert inst-alert-error">{error}</div>}

          {loading ? (
            <div className="inst-empty">
              <div className="inst-empty-icon">⏳</div>
              <div className="inst-empty-text">Loading history…</div>
            </div>
          ) : (
            <>
              {/* Charts */}
              {(pieData.length > 0 || equipBarData.length > 0) && (
                <div className="inst-chart-grid-2" style={{ marginBottom: 28 }}>
                  {pieData.length > 0 && (
                    <div className="inst-chart-card">
                      <div className="inst-chart-title">Outcome Breakdown</div>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" outerRadius={74} dataKey="value">
                            {pieData.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend iconSize={10} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  {equipBarData.length > 0 && (
                    <div className="inst-chart-card">
                      <div className="inst-chart-title">Most Used Equipment</div>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={equipBarData} layout="vertical" margin={{ top: 4, right: 20, left: 0, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                          <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#0d9488" radius={[0, 4, 4, 0]} name="Items" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              )}

              {/* Tabs */}
              <div className="inst-tab-bar">
                {TABS.map(t => (
                  <button
                    key={t.id}
                    className={`inst-tab-item${tab === t.id ? " active" : ""}`}
                    onClick={() => { setTab(t.id); setSearch("") }}
                  >
                    {t.label}
                    <span style={{
                      marginLeft: 6, fontSize: 11, fontWeight: 700,
                      background: tab === t.id ? "var(--inst-teal-pale)" : "var(--inst-slate-200)",
                      color: tab === t.id ? "var(--inst-teal)" : "var(--inst-slate-600)",
                      padding: "1px 6px", borderRadius: 10,
                    }}>
                      {tabCount(t.id)}
                    </span>
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="inst-filter-bar">
                <div className="inst-filter-wrap">
                  <span className="inst-filter-icon">🔍</span>
                  <input
                    className="inst-filter-input"
                    placeholder="Search by ID, equipment, lab, lecturer…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
              </div>

              {/* Empty state */}
              {filtered.length === 0 && (
                <div className="inst-empty">
                  <div className="inst-empty-icon">{tab === "rejected" ? "❌" : "📋"}</div>
                  <div className="inst-empty-text">
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
                  <div key={`${r.requestId}-${it.requestItemId}`} className="inst-card">
                    <div className="inst-card-top">
                      <div className="inst-card-title">
                        <span style={{ color: "var(--inst-teal)", fontWeight: 800 }}>#{r.requestId}</span>
                        <span style={{ color: "var(--inst-text-muted)", fontWeight: 400 }}>·</span>
                        <span>{it.equipmentName || `Equipment #${it.equipmentId}`}</span>
                        {r.purpose && (
                          <span className={`inst-purpose ${String(r.purpose).toLowerCase()}`}>
                            {r.purpose}
                          </span>
                        )}
                      </div>
                      <span className={itemSpClass(it.itemStatus)}>
                        {itemStatusLabel(it.itemStatus)}
                      </span>
                    </div>
                    <div className="inst-card-body">
                      <div className="inst-meta-grid">
                        <div>
                          <div className="inst-mi-label">Lab</div>
                          <div className="inst-mi-value">{r.labName || "—"}</div>
                        </div>
                        <div>
                          <div className="inst-mi-label">Lecturer</div>
                          <div className="inst-mi-value muted">{r.lecturerName || "—"}</div>
                        </div>
                        <div>
                          <div className="inst-mi-label">Period</div>
                          <div className="inst-mi-value muted">{r.fromDate || "—"} → {r.toDate || "—"}</div>
                        </div>
                        <div>
                          <div className="inst-mi-label">Qty</div>
                          <div className="inst-mi-value">{it.quantity ?? "—"}</div>
                        </div>
                        {it.issuedQty != null && (
                          <div>
                            <div className="inst-mi-label">Issued Qty</div>
                            <div className="inst-mi-value">{it.issuedQty}</div>
                          </div>
                        )}
                        {it.itemType && (
                          <div>
                            <div className="inst-mi-label">Item Type</div>
                            <div className="inst-mi-value muted">{it.itemType}</div>
                          </div>
                        )}
                        {it.damaged != null && (
                          <div>
                            <div className="inst-mi-label">Damaged</div>
                            <div className="inst-mi-value" style={{
                              color: it.damaged ? "var(--inst-red)" : "var(--inst-green)"
                            }}>
                              {it.damaged ? "Yes" : "No"}
                            </div>
                          </div>
                        )}
                        {it.returned != null && (
                          <div>
                            <div className="inst-mi-label">Returned</div>
                            <div className="inst-mi-value" style={{
                              color: it.returned ? "var(--inst-green)" : "var(--inst-text-muted)"
                            }}>
                              {it.returned ? "Yes" : "No"}
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