import "../styles/hodTheme.css"
import Sidebar from "../components/Sidebar"
import Topbar from "../components/Topbar"
import { useEffect, useMemo, useState } from "react"
import { HodLabAPI, AuthAPI } from "../api/api"
import { AiOutlineCheckCircle, AiOutlineCloseCircle } from "react-icons/ai"
import { MdOutlineScience } from "react-icons/md"
import { FaUserCog } from "react-icons/fa"

export default function HodLabManagement() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [labs, setLabs]               = useState([])
  const [toUsers, setToUsers]         = useState([])
  const [user, setUser]               = useState(null)
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState({})   // { labId: bool }
  const [messages, setMessages]       = useState({})   // { labId: { text, ok } }
  const [error, setError]             = useState("")

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const me = await AuthAPI.me()
        const [labList, toList] = await Promise.all([
          HodLabAPI.labs(),
          HodLabAPI.deptTOs(),
        ])
        if (!alive) return
        setUser(me)
        setLabs(Array.isArray(labList) ? labList : [])
        setToUsers(Array.isArray(toList) ? toList : [])
      } catch (e) {
        if (alive) setError(e?.message || "Failed to load")
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  const setMsg = (labId, text, ok) => {
    setMessages(p => ({ ...p, [labId]: { text, ok } }))
    setTimeout(() => setMessages(p => { const n = { ...p }; delete n[labId]; return n }), 4000)
  }

  const handleAssign = async (labId, toUserId) => {
    setSaving(p => ({ ...p, [labId]: true }))
    try {
      if (!toUserId) {
        await HodLabAPI.clearTo(labId)
        setLabs(p => p.map(l =>
          l.id === labId ? { ...l, technicalOfficerId: null, technicalOfficerName: null } : l
        ))
        setMsg(labId, "Technical Officer removed", true)
      } else {
        await HodLabAPI.assignTo(labId, Number(toUserId))
        const assigned = toUsers.find(u => String(u.id) === String(toUserId))
        setLabs(p => p.map(l =>
          l.id === labId
            ? { ...l, technicalOfficerId: Number(toUserId), technicalOfficerName: assigned?.fullName || null }
            : l
        ))
        setMsg(labId, `Assigned: ${assigned?.fullName || "TO"} successfully`, true)
      }
    } catch (e) {
      setMsg(labId, e?.message || "Failed to update", false)
    } finally {
      setSaving(p => ({ ...p, [labId]: false }))
    }
  }

  const assignedCount = useMemo(() =>
    labs.filter(l => !!(l.technicalOfficerId ?? l.technicalOfficer?.id)).length
  , [labs])

  return (
    <div className="dashboard-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <div className="content">

          <div className="hod-page-header">
            <div>
              <div className="hod-page-title">Lab Management</div>
              <div className="hod-page-subtitle">
                Assign Technical Officers to labs &nbsp;·&nbsp; Dept: {user?.department || "–"}
              </div>
            </div>
          </div>

          {error && <div className="hod-alert hod-alert-error">{error}</div>}

          {/* Stats */}
          <div className="stat-grid" style={{ marginBottom: 24 }}>
            <div className="stat-card blue">
              <div className="stat-label">Total Labs</div>
              <div className="stat-value">{labs.length}</div>
            </div>
            <div className="stat-card green">
              <div className="stat-label">Assigned</div>
              <div className="stat-value">{assignedCount}</div>
            </div>
            <div className="stat-card amber">
              <div className="stat-label">Unassigned</div>
              <div className="stat-value">{labs.length - assignedCount}</div>
            </div>
            <div className="stat-card slate">
              <div className="stat-label">Available TOs</div>
              <div className="stat-value">{toUsers.length}</div>
            </div>
          </div>

          {toUsers.length === 0 && !loading && (
            <div className="hod-alert hod-alert-amber">
              No Technical Officers found in department <strong>{user?.department}</strong>.
              Ask the Admin to create TO accounts for your department.
            </div>
          )}

          {loading ? (
            <div className="empty-block">
              <div className="empty-icon">⏳</div>
              <div className="empty-text">Loading labs…</div>
            </div>
          ) : labs.length === 0 ? (
            <div className="empty-block">
              <div className="empty-icon">🏛</div>
              <div className="empty-text">No labs found for your department.</div>
            </div>
          ) : (
            labs.map(lab => {
              const msg       = messages[lab.id]
              const isSaving  = !!saving[lab.id]
              const currentId = lab.technicalOfficerId ?? lab.technicalOfficer?.id ?? null
              const currentName =
                lab.technicalOfficerName ||
                lab.technicalOfficer?.fullName ||
                (currentId ? toUsers.find(u => u.id === currentId)?.fullName : null) ||
                null

              return (
                <div key={lab.id} className="lab-mgmt-card">
                  <div className="lab-mgmt-header">
                    <div>
                      <div className="lab-mgmt-name">
                        <MdOutlineScience size={18} />
                        {lab.name}
                      </div>
                      <div className="lab-mgmt-current">
                        Current TO:{" "}
                        {currentName
                          ? <strong>{currentName}</strong>
                          : <span style={{ color: "var(--text-muted)" }}>Not assigned</span>
                        }
                      </div>
                    </div>
                    <span className={currentId ? "sp sp-green" : "sp sp-amber"}>
                      {currentId ? "✓ Assigned" : "Unassigned"}
                    </span>
                  </div>

                  <div className="lab-mgmt-body">
                    <FaUserCog size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                    <select
                      className="lab-mgmt-select"
                      value={currentId || ""}
                      onChange={e => handleAssign(lab.id, e.target.value || null)}
                      disabled={isSaving}
                    >
                      <option value="">— Remove / No TO —</option>
                      {toUsers.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.fullName || u.email} ({u.email})
                        </option>
                      ))}
                    </select>

                    {isSaving && (
                      <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Saving…</span>
                    )}
                    {msg && (
                      <span className={msg.ok ? "lab-mgmt-msg-ok" : "lab-mgmt-msg-err"}>
                        {msg.ok ? <AiOutlineCheckCircle /> : <AiOutlineCloseCircle />}
                        {msg.text}
                      </span>
                    )}
                  </div>
                </div>
              )
            })
          )}

          <div className="hod-alert hod-alert-info" style={{ marginTop: 20 }}>
            <strong>Note:</strong> Only TOs in your department are shown.
            A single TO can be assigned to multiple labs.
            Changes take effect immediately.
          </div>

        </div>
      </div>
    </div>
  )
}