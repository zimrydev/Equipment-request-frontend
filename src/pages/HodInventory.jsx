import "../styles/hodTheme.css"
import Sidebar from "../components/Sidebar"
import Topbar from "../components/Topbar"
import { useEffect, useMemo, useState } from "react"
import { AuthAPI, CommonAPI } from "../api/api"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

export default function HodInventory() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState("")
  const [labs, setLabs]         = useState([])
  const [equipment, setEquipment] = useState([])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const me      = await AuthAPI.me()
        const labList = (await CommonAPI.labs(me.department)) || []
        const rows = []
        await Promise.all(labList.map(async lab => {
          const eq = (await CommonAPI.equipmentByLab(lab.id)) || []
          eq.forEach(e => rows.push({
            id:           `${lab.id}-${e.id}`,
            labId:        lab.id,
            labName:      lab.name,
            equipment:    e.name,
            totalQty:     e.totalQty     ?? 0,
            availableQty: e.availableQty ?? 0,
          }))
        }))
        if (!alive) return
        setLabs(labList)
        setEquipment(rows)
      } catch (e) {
        if (alive) setError(e?.message || "Failed to load")
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  /* group by lab */
  const labGroups = useMemo(() => {
    const map = {}
    for (const lab of labs) map[lab.id] = { labName: lab.name, items: [] }
    for (const row of equipment) {
      if (map[row.labId]) map[row.labId].items.push(row)
    }
    for (const key of Object.keys(map)) {
      map[key].items.sort((a, b) => a.equipment.localeCompare(b.equipment))
    }
    return Object.values(map)
  }, [labs, equipment])

  /* availability chart */
  const availChart = useMemo(() => {
    return labGroups.map(g => ({
      lab:   g.labName.replace(/ Lab$/i, ""),
      total: g.items.reduce((s, r) => s + r.totalQty, 0),
      avail: g.items.reduce((s, r) => s + r.availableQty, 0),
      inUse: g.items.reduce((s, r) => s + Math.max(0, r.totalQty - r.availableQty), 0),
    }))
  }, [labGroups])

  const totals = useMemo(() => ({
    totalItems: equipment.length,
    totalQty:   equipment.reduce((s, r) => s + r.totalQty, 0),
    availQty:   equipment.reduce((s, r) => s + r.availableQty, 0),
    inUse:      equipment.reduce((s, r) => s + Math.max(0, r.totalQty - r.availableQty), 0),
    zeroItems:  equipment.filter(r => r.availableQty === 0).length,
  }), [equipment])

  return (
    <div className="dashboard-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <div className="content">

          <div className="hod-page-header">
            <div>
              <div className="hod-page-title">Inventory</div>
              <div className="hod-page-subtitle">{labs.length} lab{labs.length !== 1 ? "s" : ""} in your department</div>
            </div>
          </div>

          {error && <div className="hod-alert hod-alert-error">{error}</div>}

          {/* Stats */}
          <div className="stat-grid">
            <div className="stat-card blue">
              <div className="stat-label">Total Equipment Types</div>
              <div className="stat-value">{loading ? "–" : totals.totalItems}</div>
            </div>
            <div className="stat-card slate">
              <div className="stat-label">Total Quantity</div>
              <div className="stat-value">{loading ? "–" : totals.totalQty}</div>
            </div>
            <div className="stat-card green">
              <div className="stat-label">Available</div>
              <div className="stat-value">{loading ? "–" : totals.availQty}</div>
            </div>
            <div className="stat-card amber">
              <div className="stat-label">In Use</div>
              <div className="stat-value">{loading ? "–" : totals.inUse}</div>
            </div>
            <div className="stat-card red">
              <div className="stat-label">Out of Stock</div>
              <div className="stat-value">{loading ? "–" : totals.zeroItems}</div>
            </div>
          </div>

          {/* Availability chart */}
          {!loading && availChart.length > 0 && (
            <div className="chart-card" style={{ marginBottom: 24 }}>
              <div className="chart-card-title">Lab Equipment — Availability Overview</div>
              <ResponsiveContainer width="100%" height={Math.max(180, availChart.length * 40)}>
                <BarChart data={availChart} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="lab" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip />
                  <Bar dataKey="avail" stackId="a" fill="#16a34a" name="Available" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="inUse" stackId="a" fill="#d97706" name="In Use" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {loading && (
            <div className="empty-block"><div className="empty-icon">⏳</div><div className="empty-text">Loading inventory…</div></div>
          )}

          {/* Per-lab tables */}
          {!loading && labGroups.map(g => (
            <div key={g.labName} className="inv-lab-block">
              <div className="inv-lab-header">
                <span>{g.labName}</span>
                <span className="inv-badge">{g.items.length} item{g.items.length !== 1 ? "s" : ""}</span>
              </div>
              {g.items.length === 0 ? (
                <div style={{ padding: "16px 20px", background: "var(--white)", border: "1px solid var(--slate-200)", borderTop: "none", borderRadius: "0 0 var(--radius-sm) var(--radius-sm)", fontSize: 13.5, color: "var(--text-muted)" }}>
                  No equipment in this lab
                </div>
              ) : (
                <div className="inv-table-wrap">
                  <table className="hod-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Equipment</th>
                        <th className="tc">Total Qty</th>
                        <th className="tc">Available</th>
                        <th className="tc">In Use</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.items.map((r, idx) => {
                        const inUse = Math.max(0, r.totalQty - r.availableQty)
                        const isZero = r.availableQty === 0
                        return (
                          <tr key={r.id}>
                            <td className="muted">{idx + 1}</td>
                            <td style={{ fontWeight: 500 }}>{r.equipment}</td>
                            <td className="tc">{r.totalQty}</td>
                            <td className="tc">
                              <span className={isZero ? "avail-zero" : r.availableQty < 3 ? "avail-low" : "avail-ok"}>
                                {r.availableQty}
                              </span>
                            </td>
                            <td className="tc">{inUse}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}

          {!loading && labGroups.length === 0 && (
            <div className="empty-block"><div className="empty-icon">🏛</div><div className="empty-text">No labs found for your department</div></div>
          )}

        </div>
      </div>
    </div>
  )
}