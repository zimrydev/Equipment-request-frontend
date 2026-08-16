import "../styles/studentTheme.css"
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import Sidebar from "../components/Sidebar"
import Topbar from "../components/Topbar"
import { AuthAPI, CommonAPI, StudentRequestAPI } from "../api/api"

/*
  NewRequestDTO (backend):
    labId, lecturerId, purpose, purposeNote,
    fromDate (LocalDate), toDate (LocalDate),
    fromTime (LocalTime — HH:mm), toTime (LocalTime — HH:mm),   ← NEW
    items: [{ equipmentId, quantity }]
*/

const PURPOSE_OPTIONS = ["LABS", "LECTURE", "RESEARCH", "PROJECT", "PERSONAL"]

export default function NewRequest() {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const [me,   setMe]   = useState(null)
  const [dept, setDept] = useState("")

  const [labs,        setLabs]        = useState([])
  const [labId,       setLabId]       = useState("")
  const [labsLoading, setLabsLoading] = useState(true)

  const [lecturers,  setLecturers]  = useState([])
  const [lecturerId, setLecturerId] = useState("")

  const [equipOptions, setEquipOptions] = useState([])
  const [equipmentId,  setEquipmentId]  = useState("")
  const [eqLoading,    setEqLoading]    = useState(false)
  const [qty,          setQty]          = useState("1")

  const [purpose,     setPurpose]     = useState("")
  const [purposeNote, setPurposeNote] = useState("")
  const [fromDate,    setFromDate]    = useState("")
  const [fromTime,    setFromTime]    = useState("")   // NEW
  const [toDate,      setToDate]      = useState("")
  const [toTime,      setToTime]      = useState("")   // NEW

  const [items, setItems] = useState([])

  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState("")
  const [success,    setSuccess]    = useState("")

  useEffect(() => {
    const init = async () => {
      try {
        setLabsLoading(true)
        const user = await AuthAPI.me()
        setMe(user)
        const department = user.department || ""
        setDept(department)
        const [allLabs, allLec] = await Promise.all([
          CommonAPI.labs(department),
          CommonAPI.lecturers(department),
        ])
        setLabs(Array.isArray(allLabs) ? allLabs : [])
        setLecturers(Array.isArray(allLec) ? allLec : [])
      } catch (e) {
        setError(e?.message || "Failed to load form data")
      } finally {
        setLabsLoading(false)
      }
    }
    init()
  }, [])

  useEffect(() => {
    if (!labId) { setEquipOptions([]); setEquipmentId(""); return }
    const load = async () => {
      try {
        setEqLoading(true)
        setEquipOptions([]); setEquipmentId("")
        const list = (await CommonAPI.equipmentByLab(labId)) || []
        setEquipOptions(list)
        if (list.length) setEquipmentId(String(list[0].id))
      } catch (e) {
        setError(e?.message || "Failed to load equipment for this lab")
      } finally {
        setEqLoading(false)
      }
    }
    load()
  }, [labId])

  const selectedEquip = useMemo(
    () => equipOptions.find(e => String(e.id) === String(equipmentId)),
    [equipOptions, equipmentId]
  )

  const addToCart = () => {
    setError("")
    if (!labId)       return setError("Please select a lab first.")
    if (!equipmentId) return setError("Please select equipment.")
    const q = parseInt(qty, 10)
    if (!q || q <= 0) return setError("Quantity must be a positive number.")
    setItems(prev => {
      const idx = prev.findIndex(it => String(it.equipmentId) === String(equipmentId))
      if (idx >= 0) return prev.map((it, i) => i === idx ? { ...it, quantity: it.quantity + q } : it)
      return [...prev, {
        equipmentId:   Number(equipmentId),
        equipmentName: selectedEquip?.name || `Equipment #${equipmentId}`,
        itemType:      selectedEquip?.itemType || "",
        category:      selectedEquip?.category || "",
        quantity:      q,
      }]
    })
    setQty("1")
  }

  const removeItem    = (eid) => setItems(prev => prev.filter(it => String(it.equipmentId) !== String(eid)))
  const updateItemQty = (eid, val) => {
    const q = parseInt(val, 10)
    if (!q || q <= 0) return
    setItems(prev => prev.map(it => String(it.equipmentId) === String(eid) ? { ...it, quantity: q } : it))
  }

  const validate = () => {
    if (!labId)       return "Please select a lab."
    if (!lecturerId)  return "Please select a lecturer."
    if (!purpose)     return "Please select a purpose."
    if (!fromDate)    return "From date is required."
    if (!fromTime)    return "From time is required."
    if (!toDate)      return "To date is required."
    if (!toTime)      return "To time is required."
    // datetime comparison
    const from = new Date(`${fromDate}T${fromTime}`)
    const to   = new Date(`${toDate}T${toTime}`)
    if (from >= to)   return "To date/time must be after From date/time."
    if (items.length === 0) return "Add at least one equipment item to the cart."
    return ""
  }

  const canSubmit = useMemo(() => {
    if (!labId || !lecturerId || !purpose || !fromDate || !fromTime || !toDate || !toTime) return false
    if (new Date(`${fromDate}T${fromTime}`) >= new Date(`${toDate}T${toTime}`)) return false
    return items.length > 0
  }, [labId, lecturerId, purpose, fromDate, fromTime, toDate, toTime, items])

  const handleSubmit = async () => {
    setError(""); setSuccess("")
    const msg = validate()
    if (msg) return setError(msg)
    const payload = {
      labId:      Number(labId),
      lecturerId: Number(lecturerId),
      purpose,
      purposeNote: purposeNote.trim() || null,
      fromDate,
      fromTime: fromTime || null,    // "HH:mm" — Jackson deserialises to LocalTime
      toDate,
      toTime: toTime || null,
      items: items.map(it => ({ equipmentId: it.equipmentId, quantity: it.quantity })),
    }
    try {
      setSubmitting(true)
      await StudentRequestAPI.create(payload)
      setSuccess("Request submitted successfully! Awaiting lecturer approval.")
      setItems([])
      setPurpose(""); setPurposeNote("")
      setFromDate(""); setFromTime(""); setToDate(""); setToTime("")
      setQty(""); setLabId(""); setEquipmentId(""); setEquipOptions([])
    } catch (e) {
      setError(e?.message || "Failed to submit request")
    } finally {
      setSubmitting(false)
    }
  }

  const disabled = submitting || labsLoading

  return (
    <div className="dashboard-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <div className="content">

          <div className="st-page-header">
            <div className="st-page-header-left">
              <div className="st-page-title">New Equipment Request</div>
              <div className="st-page-subtitle">
                {me ? `${me.fullName}${me.regNo ? ` · ${me.regNo}` : ""}${dept ? ` · ${dept}` : ""}` : "Submit an equipment request for lecturer approval"}
              </div>
            </div>
            <div className="st-page-actions">
              <button className="st-btn st-btn-ghost" onClick={() => navigate("/student-dashboard")}>← Dashboard</button>
            </div>
          </div>

          {error   && <div className="st-alert st-alert-error">{error}</div>}
          {success && (
            <div className="st-alert st-alert-success">
              {success}
              <button className="st-btn st-btn-success st-btn-sm" style={{ marginLeft: 12, flexShrink: 0 }}
                onClick={() => navigate("/view-requests")}>
                View My Requests
              </button>
            </div>
          )}

          {labsLoading ? (
            <div className="st-empty">
              <div className="st-empty-icon">⏳</div>
              <div className="st-empty-text">Loading form data…</div>
            </div>
          ) : (
            <>
              {/* Section 1: Lab & Lecturer */}
              <div className="st-form-card">
                <div className="st-form-section-title">Lab &amp; Lecturer</div>
                <div className="st-form-grid st-form-grid-2">
                  <div className="st-form-group">
                    <label className="st-label">Lab *</label>
                    <select className="st-select" value={labId}
                      onChange={e => { setLabId(e.target.value); setError("") }} disabled={disabled}>
                      <option value="">— Select Lab —</option>
                      {labs.map(l => (
                        <option key={l.id} value={String(l.id)}>
                          {l.name}{l.department ? ` (${l.department})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="st-form-group">
                    <label className="st-label">Lecturer *</label>
                    <select className="st-select" value={lecturerId}
                      onChange={e => setLecturerId(e.target.value)} disabled={disabled}>
                      <option value="">— Select Lecturer —</option>
                      {lecturers.map(l => (
                        <option key={l.id} value={String(l.id)}>
                          {l.fullName}{l.email ? ` (${l.email})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Request Details */}
              <div className="st-form-card">
                <div className="st-form-section-title">Request Details</div>
                <div className="st-form-grid st-form-grid-2">
                  <div className="st-form-group">
                    <label className="st-label">Purpose *</label>
                    <select className="st-select" value={purpose}
                      onChange={e => setPurpose(e.target.value)} disabled={disabled}>
                      <option value="">— Select Purpose —</option>
                      {PURPOSE_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="st-form-group">
                    <label className="st-label">Purpose Note (optional)</label>
                    <input className="st-input" value={purposeNote}
                      onChange={e => setPurposeNote(e.target.value)}
                      placeholder="Any additional context…" disabled={disabled} />
                  </div>

                  {/* From Date + Time side by side */}
                  <div className="st-form-group">
                    <label className="st-label">From Date *</label>
                    <input className="st-input" type="date" value={fromDate}
                      onChange={e => setFromDate(e.target.value)} disabled={disabled} />
                  </div>
                  <div className="st-form-group">
                    <label className="st-label">From Time *</label>
                    <input className="st-input" type="time" value={fromTime}
                      onChange={e => setFromTime(e.target.value)} disabled={disabled} />
                  </div>

                  {/* To Date + Time side by side */}
                  <div className="st-form-group">
                    <label className="st-label">To Date *</label>
                    <input className="st-input" type="date" value={toDate}
                      min={fromDate || undefined}
                      onChange={e => setToDate(e.target.value)} disabled={disabled} />
                  </div>
                  <div className="st-form-group">
                    <label className="st-label">To Time *</label>
                    <input className="st-input" type="time" value={toTime}
                      onChange={e => setToTime(e.target.value)} disabled={disabled} />
                  </div>
                </div>
              </div>

              {/* Section 3: Add Equipment */}
              <div className="st-form-card">
                <div className="st-form-section-title">Add Equipment to Cart</div>
                <div className="st-form-grid st-form-grid-3" style={{ alignItems: "flex-end" }}>
                  <div className="st-form-group">
                    <label className="st-label">Equipment *</label>
                    <select className="st-select" value={equipmentId}
                      onChange={e => setEquipmentId(e.target.value)}
                      disabled={disabled || !labId || eqLoading || equipOptions.length === 0}>
                      {!labId          && <option value="">Select a lab first</option>}
                      {labId && eqLoading && <option>Loading…</option>}
                      {labId && !eqLoading && equipOptions.length === 0 && <option value="">No active equipment in this lab</option>}
                      {equipOptions.map(e => (
                        <option key={e.id} value={String(e.id)}>
                          {e.name}{e.availableQty != null ? ` (Avail: ${e.availableQty})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="st-form-group">
                    <label className="st-label">Quantity *</label>
                    <input className="st-input" type="number" min="1" value={qty}
                      onChange={e => setQty(e.target.value)} disabled={disabled || !equipmentId} />
                  </div>
                  <div>
                    <button className="st-btn st-btn-primary" onClick={addToCart}
                      disabled={disabled || !labId || !equipmentId}>
                      + Add to Cart
                    </button>
                  </div>
                </div>
                {selectedEquip && (
                  <div className="st-equip-info">
                    <strong>{selectedEquip.name}</strong>
                    {selectedEquip.category   && <span style={{ marginLeft:10, opacity:.8 }}>· {selectedEquip.category}</span>}
                    {selectedEquip.itemType   && <span style={{ marginLeft:10, opacity:.8 }}>· {String(selectedEquip.itemType)}</span>}
                    {selectedEquip.availableQty != null && <span style={{ marginLeft:10, opacity:.8 }}>· Available: {selectedEquip.availableQty}</span>}
                  </div>
                )}
              </div>

              {/* Cart */}
              <div className="st-section-hd" style={{ marginTop: 0 }}>
                <div className="st-section-title">
                  Request Cart
                  <span style={{ marginLeft:8, fontSize:11, fontWeight:700,
                    background: items.length ? "var(--st-indigo-pale)" : "var(--st-slate-100)",
                    color: items.length ? "var(--st-indigo)" : "var(--st-slate-500)",
                    padding:"2px 8px", borderRadius:10 }}>
                    {items.length} item{items.length !== 1 ? "s" : ""}
                  </span>
                </div>
                {items.length > 0 && (
                  <button className="st-btn st-btn-ghost st-btn-sm"
                    onClick={() => setItems([])} disabled={submitting}>
                    Clear Cart
                  </button>
                )}
              </div>

              <div className="st-cart">
                <div className="st-cart-hd">
                  <span>Equipment · Quantity · Actions</span>
                  {items.length > 0 && (
                    <span style={{ color:"var(--st-indigo)" }}>
                      All from: {labs.find(l => String(l.id) === String(labId))?.name || "—"}
                    </span>
                  )}
                </div>
                {items.length === 0 && (
                  <div className="st-cart-empty">No items added — select equipment above and click "Add to Cart"</div>
                )}
                {items.map(it => (
                  <div key={it.equipmentId} className="st-cart-item">
                    <div>
                      <div className="st-cart-name">{it.equipmentName}</div>
                      <div className="st-cart-meta">
                        {it.itemType && (
                          <span style={{ marginRight:8, padding:"1px 7px", borderRadius:4, fontSize:10.5, fontWeight:700, textTransform:"uppercase",
                            background: String(it.itemType)==="RETURNABLE" ? "var(--st-green-pale)" : "var(--st-amber-pale)",
                            color: String(it.itemType)==="RETURNABLE" ? "var(--st-green)" : "var(--st-amber)" }}>
                            {String(it.itemType)}
                          </span>
                        )}
                        {it.category && <span>{it.category}</span>}
                      </div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <input className="st-input" type="number" min="1" value={it.quantity}
                        onChange={e => updateItemQty(it.equipmentId, e.target.value)}
                        style={{ width:72 }} disabled={submitting} />
                      <span className="st-muted">units</span>
                      <button className="st-btn st-btn-ghost st-btn-sm"
                        onClick={() => removeItem(it.equipmentId)} disabled={submitting}>
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {items.length > 0 && (
                <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:4 }}>
                  <button className="st-btn st-btn-ghost"
                    onClick={() => navigate("/student-dashboard")} disabled={submitting}>
                    Cancel
                  </button>
                  <button className="st-btn st-btn-primary" onClick={handleSubmit}
                    disabled={!canSubmit || submitting}>
                    {submitting ? "Submitting…" : `Submit Request (${items.length} item${items.length !== 1 ? "s" : ""})`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}