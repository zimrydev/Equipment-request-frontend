import "../styles/dashboard.css"
import "../styles/adminTheme.css"
import Sidebar from "../components/Sidebar"
import Topbar from "../components/Topbar"
import { useEffect, useMemo, useState } from "react"
import { AdminAPI } from "../api/api"
import {
  AiOutlineUserAdd, AiOutlineUserDelete,
  AiOutlineStop, AiOutlineCheckCircle, AiOutlineEdit,
  AiOutlineClose, AiOutlineWarning
} from "react-icons/ai"
import { FaUserShield, FaUserCog, FaChalkboardTeacher, FaUserTie, FaUserGraduate, FaSearch } from "react-icons/fa"

/* ── Validation ── */
const emailOk = v => /\S+@\S+\.\S+/.test((v || "").trim())

/* ── Role config ── */
const ROLE_CONFIG = [
  { key: "hod",      label: "HOD",                icon: <FaUserShield />,        color: "#2563eb", maxOne: true, note: "One HOD per department" },
  { key: "to",       label: "Technical Officers",  icon: <FaUserCog />,           color: "#7c3aed" },
  { key: "lecturer", label: "Lecturers",           icon: <FaChalkboardTeacher />, color: "#16a34a" },
  { key: "staff",    label: "Staff / Instructors", icon: <FaUserTie />,           color: "#d97706" },
]

/* ── Parse backend error message from response ── */
async function parseError(e) {
  // If the error has a response body with { error: "..." }, extract it
  if (e?.response) {
    try {
      const body = await e.response.json()
      if (body?.error) return body.error
      if (body?.message) return body.message
    } catch { /* ignore */ }
  }
  return e?.message || "Something went wrong"
}

export default function AdminUsers() {
  const [sidebarOpen, setSidebarOpen]   = useState(false)
  const [departments,  setDepartments]  = useState([])
  const [dept,         setDept]         = useState("")
  const [userData,     setUserData]     = useState(null)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState("")
  const [notice,       setNotice]       = useState("")
  const [editStudent,  setEditStudent]  = useState(null)
  const [searchStudents, setSearchStudents] = useState("")

  /* load departments once */
  useEffect(() => {
    AdminAPI.departments()
      .then(list => {
        const arr = Array.isArray(list) ? list : []
        setDepartments(arr)
        if (arr.length) setDept(arr[0].name || arr[0])
      })
      .catch(e => showError(e?.message || "Failed to load departments"))
  }, [])

  /* load users when dept changes */
  useEffect(() => { if (dept) loadUsers(dept) }, [dept])

  const loadUsers = async (d = dept) => {
    if (!d) return
    setError(""); setNotice("")
    try {
      setLoading(true)
      const dto = await AdminAPI.departmentUsers(d)
      setUserData(dto || null)
    } catch (e) { showError(e?.message || "Failed to load") }
    finally { setLoading(false) }
  }

  const showNotice = (msg) => { setNotice(msg); setTimeout(() => setNotice(""), 5000) }
  const showError  = (msg) => { setError(msg);  setTimeout(() => setError(""),  7000) }

  /* ── Create user ── */
  const onCreate = async (roleKey, payload) => {
    setError(""); setNotice("")
    try {
      const body = { ...payload, department: dept }
      if (roleKey === "hod")      await AdminAPI.createHod(body)
      else if (roleKey === "to")       await AdminAPI.createTo(body)
      else if (roleKey === "lecturer") await AdminAPI.createLecturer(body)
      else if (roleKey === "staff")    await AdminAPI.createStaff(body)
      else { showError("Invalid role"); return false }
      showNotice(`${roleKey.toUpperCase()} created — default password is Default@123`)
      await loadUsers()
      return true
    } catch (e) {
      // Try to extract the backend's validation message (e.g. "Dept CE already has an HOD")
      const msg = await parseError(e)
      showError(msg)
      return false
    }
  }

  /* ── Delete user ── */
  const onRemove = async (id) => {
    try {
      await AdminAPI.deleteUser(id)
      showNotice("User removed successfully")
      await loadUsers()
    } catch (e) {
      const msg = await parseError(e)
      // 409 Conflict = has linked records — guide admin to disable instead
      if (msg.includes("request") || msg.includes("record")) {
        showError(msg + " → Use the Disable button to deactivate without deleting records.")
      } else {
        showError(msg)
      }
    }
  }

  /* ── Disable / Enable toggle — calls correct endpoint ── */
  const onToggleDisable = async (user) => {
    try {
      if (user.enabled === false) {
        // Re-enable
        await AdminAPI.enableUser(user.id)
        showNotice(`${user.fullName} has been re-activated`)
      } else {
        // Disable
        await AdminAPI.disableUser(user.id)
        showNotice(`${user.fullName} has been disabled`)
      }
      await loadUsers()
    } catch (e) {
      const msg = await parseError(e)
      showError(msg)
    }
  }

  /* ── Update student ── */
  const onUpdateStudent = async (id, payload) => {
    try {
      await AdminAPI.updateUser(id, payload)
      showNotice("Student updated successfully")
      setEditStudent(null)
      await loadUsers()
    } catch (e) {
      const msg = await parseError(e)
      showError(msg)
    }
  }

  const groups = useMemo(() => {
    const safe = v => Array.isArray(v) ? v : []
    return {
      hod:      safe(userData?.hods),
      to:       safe(userData?.tos),
      lecturer: safe(userData?.lecturers),
      staff:    safe(userData?.staff),
      students: safe(userData?.students),
    }
  }, [userData])

  const filteredStudents = useMemo(() => {
    const q = searchStudents.toLowerCase()
    if (!q) return groups.students
    return groups.students.filter(s =>
      String(s.fullName || "").toLowerCase().includes(q) ||
      String(s.regNo   || "").toLowerCase().includes(q) ||
      String(s.email   || "").toLowerCase().includes(q)
    )
  }, [groups.students, searchStudents])

  const totalCount = Object.values(groups).flat().length

  return (
    <div className="dashboard-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <div className="content">

          <div className="admin-page-header">
            <div>
              <div className="admin-page-title">User Management</div>
              <div className="admin-page-subtitle">Create, manage and deactivate department users</div>
            </div>
            <select className="a-filter-select" value={dept} onChange={e => setDept(e.target.value)}>
              {departments.map(d => {
                const n = d.name || d
                return <option key={n} value={n}>{n}</option>
              })}
            </select>
          </div>

          {error  && (
            <div className="a-alert a-alert-error" style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <AiOutlineWarning style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{error}</span>
            </div>
          )}
          {notice && <div className="a-alert a-alert-success">{notice}</div>}

          {/* Stats */}
          {!loading && userData && (
            <div className="admin-stat-grid" style={{ marginBottom: 24 }}>
              {ROLE_CONFIG.map(rc => (
                <div key={rc.key} className="admin-stat-card blue">
                  <div className="admin-stat-label" style={{ color: rc.color }}>{rc.label}</div>
                  <div className="admin-stat-value">{groups[rc.key].length}</div>
                </div>
              ))}
              <div className="admin-stat-card slate">
                <div className="admin-stat-label">Students</div>
                <div className="admin-stat-value">{groups.students.length}</div>
              </div>
              <div className="admin-stat-card blue">
                <div className="admin-stat-label">Total Users</div>
                <div className="admin-stat-value">{totalCount}</div>
              </div>
            </div>
          )}

          {loading && (
            <div className="a-empty">
              <div className="a-empty-icon">⏳</div>
              <div className="a-empty-text">Loading users…</div>
            </div>
          )}

          {/* Role sections */}
          {!loading && ROLE_CONFIG.map(rc => (
            <UserSection
              key={rc.key}
              roleKey={rc.key}
              label={rc.label}
              icon={rc.icon}
              color={rc.color}
              note={rc.note}
              maxOne={rc.maxOne}
              rows={groups[rc.key]}
              dept={dept}
              onCreate={onCreate}
              onRemove={onRemove}
              onToggleDisable={onToggleDisable}
            />
          ))}

          {/* Students */}
          {!loading && userData && (
            <div className="a-user-section">
              <div className="a-user-section-header">
                <div className="a-user-section-title">
                  <span style={{ color: "#0891b2" }}><FaUserGraduate /></span>
                  Students
                  <span className="a-user-count">{groups.students.length}</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--a-text-muted)" }}>
                  Students self-register via the signup page
                </div>
              </div>

              {groups.students.length > 6 && (
                <div style={{ padding: "10px 20px", borderBottom: "1px solid #f1f5f9" }}>
                  <div className="a-filter-wrap" style={{ maxWidth: 300 }}>
                    <FaSearch size={12} />
                    <input className="a-filter-input" placeholder="Search name, reg no, email…"
                      value={searchStudents} onChange={e => setSearchStudents(e.target.value)} />
                  </div>
                </div>
              )}

              <div className="a-table-wrap" style={{ margin: 0, border: "none", borderRadius: 0, boxShadow: "none" }}>
                <table className="a-table">
                  <thead>
                    <tr>
                      <th>Name</th><th>Reg No</th><th>Email</th><th>Status</th>
                      <th style={{ textAlign: "center" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.length === 0 && (
                      <tr className="empty-row"><td colSpan="5">No students found</td></tr>
                    )}
                    {filteredStudents.map(u => (
                      <tr key={u.id}>
                        <td style={{ fontWeight: 600 }}>{u.fullName || "–"}</td>
                        <td className="muted">{u.regNo || "–"}</td>
                        <td className="muted">{u.email || "–"}</td>
                        <td>
                          <span className={u.enabled === false ? "a-sp a-sp-red" : "a-sp a-sp-green"}>
                            {u.enabled === false ? "Disabled" : "Active"}
                          </span>
                        </td>
                        <td className="tc">
                          <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                            <button className="a-btn a-btn-outline a-btn-sm a-btn-icon"
                              title="Edit" onClick={() => setEditStudent(u)}>
                              <AiOutlineEdit />
                            </button>
                            <button
                              className={`a-btn a-btn-sm a-btn-icon ${u.enabled === false ? "a-btn-success" : "a-btn-amber"}`}
                              title={u.enabled === false ? "Re-activate" : "Disable"}
                              onClick={() => onToggleDisable(u)}>
                              {u.enabled === false ? <AiOutlineCheckCircle /> : <AiOutlineStop />}
                            </button>
                            <InlineRemoveBtn
                              userName={u.fullName}
                              onConfirm={() => onRemove(u.id)}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {editStudent && (
            <EditStudentModal
              student={editStudent}
              onClose={() => setEditStudent(null)}
              onSave={onUpdateStudent}
            />
          )}

        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   UserSection — one panel per role (HOD / TO / Lecturer / Staff)
   ───────────────────────────────────────────────────────────── */
function UserSection({ roleKey, label, icon, color, note, maxOne, rows, dept, onCreate, onRemove, onToggleDisable }) {
  const [fullName, setFullName] = useState("")
  const [email,    setEmail]    = useState("")
  const [localErr, setLocalErr] = useState("")
  const [saving,   setSaving]   = useState(false)

  // HOD: hide add form if one already exists for this dept
  const hodExists = maxOne && rows.length >= 1

  const submit = async () => {
    setLocalErr("")
    if (!fullName.trim()) return setLocalErr("Full name is required")
    if (!emailOk(email))  return setLocalErr("Valid email required")
    // Note: password is auto-set to Default@123 by backend — no need to collect it here

    setSaving(true)
    const ok = await onCreate(roleKey, { fullName: fullName.trim(), email: email.trim() })
    if (ok) { setFullName(""); setEmail("") }
    setSaving(false)
  }

  return (
    <div className="a-user-section">
      <div className="a-user-section-header">
        <div className="a-user-section-title">
          <span style={{ color }}>{icon}</span>
          {label}
          <span className="a-user-count">{rows.length}</span>
        </div>
        {note && <div style={{ fontSize: 12, color: "var(--a-text-muted)" }}>{note}</div>}
      </div>

      {/* Add form — hide if maxOne constraint is met */}
      {hodExists ? (
        <div className="a-user-add-form" style={{ background: "#fefce8", borderBottom: "1px solid #fef08a" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#92400e" }}>
            <AiOutlineWarning />
            <span>
              <strong>{dept}</strong> already has an HOD. Remove or disable the existing HOD before adding a new one.
            </span>
          </div>
        </div>
      ) : (
        <div className="a-user-add-form">
          {localErr && (
            <div className="a-alert a-alert-error" style={{ marginBottom: 10 }}>{localErr}</div>
          )}
          <div className="a-user-add-grid">
            <div className="a-form-group">
              <label className="a-label">Full Name</label>
              <input className="a-input" placeholder="Dr. A. Kumar"
                value={fullName} onChange={e => setFullName(e.target.value)} />
            </div>
            <div className="a-form-group">
              <label className="a-label">Email</label>
              <input className="a-input" placeholder="user@eng.jfn.ac.lk"
                value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="a-form-group">
              <label className="a-label">Password</label>
              <input className="a-input" value="Default@123" disabled
                style={{ color: "#94a3b8", background: "#f8fafc" }} />
              <span style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                Auto-set — user must change on first login
              </span>
            </div>
            <div className="a-form-group" style={{ justifyContent: "flex-end" }}>
              <label className="a-label">&nbsp;</label>
              <button className="a-btn a-btn-primary" onClick={submit} disabled={saving}
                style={{ width: "100%", justifyContent: "center" }}>
                <AiOutlineUserAdd />
                {saving ? "Creating…" : `Add ${label.split(" ")[0]}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users table */}
      <div className="a-table-wrap" style={{ margin: 0, border: "none", borderRadius: 0, boxShadow: "none" }}>
        <table className="a-table">
          <thead>
            <tr>
              <th>Name</th><th>Email</th><th>Status</th>
              <th style={{ textAlign: "center" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr className="empty-row"><td colSpan="4">No {label.toLowerCase()} in {dept}</td></tr>
            )}
            {rows.map(u => (
              <tr key={u.id}>
                <td style={{ fontWeight: 600 }}>{u.fullName || u.name || "–"}</td>
                <td className="muted">{u.email || "–"}</td>
                <td>
                  <span className={u.enabled === false ? "a-sp a-sp-red" : "a-sp a-sp-green"}>
                    {u.enabled === false ? "Disabled" : "Active"}
                  </span>
                </td>
                <td className="tc">
                  <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                    <button
                      className={`a-btn a-btn-sm a-btn-icon ${u.enabled === false ? "a-btn-success" : "a-btn-amber"}`}
                      title={u.enabled === false ? "Re-activate account" : "Disable account"}
                      onClick={() => onToggleDisable(u)}>
                      {u.enabled === false ? <AiOutlineCheckCircle /> : <AiOutlineStop />}
                    </button>
                    <InlineRemoveBtn
                      userName={u.fullName}
                      onConfirm={() => onRemove(u.id)}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Inline remove with confirmation — no window.confirm
   ───────────────────────────────────────────────────────────── */
function InlineRemoveBtn({ userName, onConfirm }) {
  const [confirming, setConfirming] = useState(false)

  if (confirming) {
    return (
      <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "#dc2626", fontWeight: 600, whiteSpace: "nowrap" }}>
          Remove {userName?.split(" ")[0]}?
        </span>
        <button className="a-btn a-btn-danger a-btn-sm" style={{ padding: "3px 8px" }}
          onClick={() => { setConfirming(false); onConfirm() }}>
          Yes
        </button>
        <button className="a-btn a-btn-ghost a-btn-sm" style={{ padding: "3px 8px" }}
          onClick={() => setConfirming(false)}>
          No
        </button>
      </div>
    )
  }

  return (
    <button className="a-btn a-btn-sm a-btn-icon a-btn-danger"
      title="Remove user" onClick={() => setConfirming(true)}>
      <AiOutlineUserDelete />
    </button>
  )
}

/* ─────────────────────────────────────────────────────────────
   Edit Student Modal
   ───────────────────────────────────────────────────────────── */
function EditStudentModal({ student, onClose, onSave }) {
  const [fullName, setFullName] = useState(student?.fullName || "")
  const [regNo,    setRegNo]    = useState(student?.regNo || "")
  const [msg,      setMsg]      = useState("")
  const [saving,   setSaving]   = useState(false)

  const submit = async () => {
    setMsg("")
    if (!fullName.trim()) return setMsg("Name is required")
    setSaving(true)
    try {
      await onSave(student.id, { fullName: fullName.trim(), regNo: regNo.trim() || undefined })
    } catch (e) {
      setMsg(e?.message || "Save failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="a-modal-overlay">
      <div className="a-modal">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div className="a-modal-title">Edit Student</div>
          <button className="a-btn a-btn-ghost a-btn-icon" onClick={onClose}>
            <AiOutlineClose />
          </button>
        </div>

        {msg && <div className="a-alert a-alert-error">{msg}</div>}

        <div style={{ display: "grid", gap: 14 }}>
          <div className="a-form-group">
            <label className="a-label">Full Name</label>
            <input className="a-input" value={fullName}
              onChange={e => setFullName(e.target.value)} />
          </div>
          <div className="a-form-group">
            <label className="a-label">Reg No</label>
            <input className="a-input" placeholder="2022/E/063"
              value={regNo} onChange={e => setRegNo(e.target.value)} />
          </div>
          <div className="a-form-group">
            <label className="a-label">Email <span style={{ color: "#94a3b8", fontWeight: 400 }}>(read-only)</span></label>
            <input className="a-input" value={student?.email || ""} disabled />
          </div>
          <div className="a-form-group">
            <label className="a-label">Department <span style={{ color: "#94a3b8", fontWeight: 400 }}>(read-only)</span></label>
            <input className="a-input" value={student?.department || "–"} disabled />
          </div>
        </div>

        <div className="a-modal-actions">
          <button className="a-btn a-btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="a-btn a-btn-primary" onClick={submit} disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  )
}