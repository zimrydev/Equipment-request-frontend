import "../styles/hodTheme.css"
import Sidebar from "../components/Sidebar"
import Topbar from "../components/Topbar"
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { HodDepartmentAPI, AuthAPI } from "../api/api"
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { FaFlask, FaArrowRight } from "react-icons/fa"

const COLORS = ["#d97706", "#2563eb", "#16a34a", "#dc2626", "#7c3aed", "#0891b2"]

export default function HodReport() {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState("")
  const [requests, setRequests] = useState([])
  const [me, setMe]             = useState(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [profile, list] = await Promise.all([AuthAPI.me(), HodDepartmentAPI.requests()])
        if (!alive) return
        setMe(profile)
        setRequests(Array.isArray(list) ? list : [])
      } catch (e) {
        if (alive) setError(e?.message || "Failed to load")
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  const { overview, labs, statusPie, returnPie, labBar } = useMemo(() => {
    const toDate = s => { const d = new Date(s); return isNaN(d) ? null : d }
    const now = new Date()
    const last30 = new Date(now - 30 * 24 * 60 * 60 * 1000)
    const last30R = requests.filter(r => { const d = toDate(r.fromDate); return d && d >= last30 })
    const v = s => String(s || "").toUpperCase()

    let returned = 0, notReturned = 0
    for (const r of last30R) {
      for (const it of r.items || []) {
        if (it.returned) returned++; else notReturned++
      }
    }

    /* labs map */
    const labMap = new Map()
    for (const r of requests) {
      if (!r.labId) continue
      if (!labMap.has(r.labId)) labMap.set(r.labId, { labId: r.labId, labName: r.labName || `Lab ${r.labId}`, count: 0 })
      labMap.get(r.labId).count++
    }
    const labs = Array.from(labMap.values()).sort((a, b) => b.count - a.count)

    /* status pie */
    const sm = {}
    for (const r of last30R) { const k = String(r.status || "–").replace(/_/g, " "); sm[k] = (sm[k] || 0) + 1 }
    const statusPie = Object.entries(sm).map(([name, value]) => ({ name, value }))

    /* return pie */
    const returnPie = returned + notReturned > 0
      ? [{ name: "Returned", value: returned }, { name: "Not Returned", value: notReturned }]
      : []

    /* lab bar */
    const labBar = labs.map(l => ({ lab: l.labName.replace(/ Lab$/i, ""), count: l.count })).slice(0, 8)

    return {
      overview: {
        total: last30R.length,
        pending:  last30R.filter(r => v(r.status).includes("PENDING")).length,
        approved: last30R.filter(r => v(r.status).includes("APPROVED") || v(r.status).includes("ISSUED") || v(r.status).includes("PROCESSING")).length,
        rejected: last30R.filter(r => v(r.status).includes("REJECTED")).length,
        returned, notReturned,
      },
      labs, statusPie, returnPie, labBar,
    }
  }, [requests])

  return (
    <div className="dashboard-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <div className="content">

          <div className="hod-page-header">
            <div>
              <div className="hod-page-title">Department Reports</div>
              <div className="hod-page-subtitle">Dept: {me?.department || "–"} &nbsp;·&nbsp; Statistics for the last 30 days</div>
            </div>
          </div>

          {error && <div className="hod-alert hod-alert-error">{error}</div>}

          {/* 30-day stats */}
          <div className="stat-grid">
            <div className="stat-card blue">
              <div className="stat-label">Total Requests (30d)</div>
              <div className="stat-value">{loading ? "–" : overview.total}</div>
            </div>
            <div className="stat-card amber">
              <div className="stat-label">Pending</div>
              <div className="stat-value">{loading ? "–" : overview.pending}</div>
            </div>
            <div className="stat-card green">
              <div className="stat-label">Approved / Active</div>
              <div className="stat-value">{loading ? "–" : overview.approved}</div>
            </div>
            <div className="stat-card red">
              <div className="stat-label">Rejected</div>
              <div className="stat-value">{loading ? "–" : overview.rejected}</div>
            </div>
            <div className="stat-card green">
              <div className="stat-label">Items Returned</div>
              <div className="stat-value">{loading ? "–" : overview.returned}</div>
            </div>
            <div className="stat-card amber">
              <div className="stat-label">Not Returned</div>
              <div className="stat-value">{loading ? "–" : overview.notReturned}</div>
            </div>
          </div>

          {/* Charts row */}
          {!loading && requests.length > 0 && (
            <>
              <div className="chart-grid-2">
                {statusPie.length > 0 && (
                  <div className="chart-card">
                    <div className="chart-card-title">Request Status (Last 30 Days)</div>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={statusPie} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                          {statusPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip /><Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {returnPie.length > 0 && (
                  <div className="chart-card">
                    <div className="chart-card-title">Returns Overview (Last 30 Days)</div>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={returnPie} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                          <Cell fill="#16a34a" /><Cell fill="#d97706" />
                        </Pie>
                        <Tooltip /><Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
              {labBar.length > 0 && (
                <div className="chart-card" style={{ marginBottom: 24 }}>
                  <div className="chart-card-title">Requests by Lab (All Time)</div>
                  <ResponsiveContainer width="100%" height={Math.max(160, labBar.length * 32)}>
                    <BarChart data={labBar} layout="vertical" margin={{ left: 8, right: 20, top: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="lab" tick={{ fontSize: 11 }} width={120} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#2563eb" radius={[0, 4, 4, 0]} name="Requests" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}

          {/* Lab cards */}
          <div className="section-hd">
            <span className="section-hd-title">Lab Reports ({labs.length})</span>
          </div>

          {loading && <div className="empty-block"><div className="empty-icon">⏳</div><div className="empty-text">Loading…</div></div>}
          {!loading && labs.length === 0 && <div className="empty-block"><div className="empty-icon">🏛</div><div className="empty-text">No labs found</div></div>}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
            {labs.map(l => (
              <div key={l.labId} className="lab-report-card">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <FaFlask style={{ color: "var(--blue)", fontSize: 18, flexShrink: 0 }} />
                  <span style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>{l.labName}</span>
                </div>
                <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
                  {l.count} total request{l.count !== 1 ? "s" : ""}
                </div>
                <button
                  className="hod-btn hod-btn-primary"
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={() => navigate(`/hod-report-lab/${l.labId}`)}
                >
                  Open Report <FaArrowRight size={11} />
                </button>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  )
}