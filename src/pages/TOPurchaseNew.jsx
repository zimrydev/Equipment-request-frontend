import "../styles/toTheme.css"
import Sidebar from "../components/Sidebar"
import Topbar from "../components/Topbar"
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { AuthAPI, CommonAPI, ToPurchaseAPI } from "../api/api"

export default function TOPurchaseNew() {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  /* Lab data */
  const [labs, setLabs] = useState([])
  const [labId, setLabId] = useState("")
  const [labsLoading, setLabsLoading] = useState(true)

  /* Equipment data for selected lab */
  const [equipmentOptions, setEquipmentOptions] = useState([])
  const [equipmentId, setEquipmentId] = useState("")
  const [eqLoading, setEqLoading] = useState(false)

  /* Cart */
  const [qty, setQty] = useState("1")
  const [items, setItems] = useState([])

  /* ── Load labs assigned to this TO ── */
  useEffect(() => {
    const loadLabs = async () => {
      try {
        setLabsLoading(true)
        const me = await AuthAPI.me()
        const deptLabs = (await CommonAPI.labs(me.department)) || []
        /*
          The lab object may expose the TO either as:
            l.technicalOfficerId  (flat id field)
            l.technicalOfficer?.id (nested object)
          We support both to be safe.
        */
        const myLabs = deptLabs.filter(l => {
          const toId = l.technicalOfficerId ?? l.technicalOfficer?.id
          return String(toId) === String(me.id)
        })
        setLabs(myLabs)
        if (myLabs.length) setLabId(String(myLabs[0].id))
      } catch (e) {
        setError(e?.message || "Failed to load labs")
      } finally {
        setLabsLoading(false)
      }
    }
    loadLabs()
  }, [])

  /* ── Load equipment when lab changes ── */
  useEffect(() => {
    if (!labId) return
    const loadEquipment = async () => {
      try {
        setEqLoading(true)
        setEquipmentOptions([])
        setEquipmentId("")
        const list = (await CommonAPI.equipmentByLab(labId)) || []
        const active = list.filter(e => e.active !== false)
        setEquipmentOptions(active)
        if (active.length) setEquipmentId(String(active[0].id))
      } catch (e) {
        setError(e?.message || "Failed to load equipment")
      } finally {
        setEqLoading(false)
      }
    }
    loadEquipment()
  }, [labId])

  const selectedEquipment = useMemo(
    () => equipmentOptions.find(e => String(e.id) === String(equipmentId)),
    [equipmentOptions, equipmentId]
  )

  /* ── Cart actions ── */
  const addItem = () => {
    setError("")
    const q = Number(qty)
    if (!equipmentId) return setError("Please select equipment")
    if (!q || q <= 0) return setError("Quantity must be greater than 0")

    setItems(prev => {
      const existing = prev.find(it => String(it.equipmentId) === String(equipmentId))
      if (existing) {
        return prev.map(it =>
          String(it.equipmentId) === String(equipmentId)
            ? { ...it, quantity: it.quantity + q }
            : it
        )
      }
      return [...prev, {
        equipmentId: Number(equipmentId),
        equipmentName: selectedEquipment?.name || `Equipment #${equipmentId}`,
        quantity: q,
      }]
    })
    setQty("1")
  }

  const removeItem = (eid) =>
    setItems(prev => prev.filter(it => String(it.equipmentId) !== String(eid)))

  const updateQty = (eid, newQty) => {
    const q = Number(newQty)
    if (!q || q <= 0) return
    setItems(prev => prev.map(it =>
      String(it.equipmentId) === String(eid) ? { ...it, quantity: q } : it
    ))
  }

  /* ── Submit ── */
  const submit = async () => {
    if (!items.length) return setError("Add at least one item to the request")
    setError("")
    setSuccess("")
    try {
      setSubmitting(true)
      await ToPurchaseAPI.submit({
        reason: "",
        items: items.map(it => ({
          equipmentId: it.equipmentId,
          quantityRequested: it.quantity,
          remark: "",
        })),
      })
      setItems([])
      setSuccess("Purchase request submitted to HOD successfully.")
    } catch (e) {
      setError(e?.message || "Failed to submit purchase request")
    } finally {
      setSubmitting(false)
    }
  }

  const disabled = submitting || labsLoading || eqLoading

  return (
    <div className="dashboard-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <div className="content">

          <div className="to-page-header">
            <div>
              <div className="to-page-title">New Purchase Request</div>
              <div className="to-page-subtitle">Request equipment procurement from your assigned labs</div>
            </div>
            <button className="to-btn to-btn-ghost" onClick={() => navigate("/to-purchase")}>
              ← My Purchases
            </button>
          </div>

          {error && <div className="to-alert to-alert-error">{error}</div>}
          {success && (
            <div className="to-alert to-alert-success">
              {success}
              <button
                className="to-btn to-btn-success to-btn-sm"
                style={{ marginLeft: 12 }}
                onClick={() => navigate("/to-purchase")}
              >
                View My Purchases
              </button>
            </div>
          )}

          {labs.length === 0 && !labsLoading && (
            <div className="to-alert to-alert-amber">
              No labs are currently assigned to you. Contact your HOD to get lab assignments.
            </div>
          )}

          {/* Form Card */}
          {labs.length > 0 && (
            <div className="to-form-card">
              <div className="to-section-hd" style={{ marginTop: 0 }}>
                <div className="to-section-title">Select Equipment</div>
              </div>
              <div className="to-form-grid to-form-grid-3" style={{ alignItems: "flex-end" }}>
                <div className="to-form-group">
                  <label className="to-label">Lab</label>
                  <select
                    className="to-select"
                    value={labId}
                    onChange={e => setLabId(e.target.value)}
                    disabled={disabled}
                  >
                    {labs.map(l => (
                      <option key={l.id} value={String(l.id)}>{l.name}</option>
                    ))}
                  </select>
                </div>

                <div className="to-form-group">
                  <label className="to-label">Equipment</label>
                  <select
                    className="to-select"
                    value={equipmentId}
                    onChange={e => setEquipmentId(e.target.value)}
                    disabled={disabled || equipmentOptions.length === 0}
                  >
                    {eqLoading && <option>Loading…</option>}
                    {!eqLoading && equipmentOptions.length === 0 && (
                      <option value="">No equipment in this lab</option>
                    )}
                    {equipmentOptions.map(e => (
                      <option key={e.id} value={String(e.id)}>{e.name}</option>
                    ))}
                  </select>
                </div>

                <div className="to-form-group">
                  <label className="to-label">Quantity</label>
                  <input
                    className="to-input"
                    type="number"
                    min="1"
                    value={qty}
                    onChange={e => setQty(e.target.value)}
                    disabled={disabled}
                  />
                </div>

                <div className="to-form-group" style={{ justifyContent: "flex-end" }}>
                  <button
                    className="to-btn to-btn-primary"
                    onClick={addItem}
                    disabled={disabled || !equipmentId || equipmentOptions.length === 0}
                    style={{ alignSelf: "flex-end" }}
                  >
                    + Add to Request
                  </button>
                </div>
              </div>

              {/* Equipment info */}
              {selectedEquipment && (
                <div style={{
                  marginTop: 12, padding: "10px 14px", background: "var(--to-blue-pale)",
                  border: "1px solid var(--to-blue-bd)", borderRadius: "var(--to-r-sm)",
                  fontSize: 13, color: "#1d4ed8", fontFamily: "Plus Jakarta Sans, sans-serif"
                }}>
                  <strong>{selectedEquipment.name}</strong>
                  {selectedEquipment.category && <span style={{ marginLeft: 8, opacity: .8 }}>· {selectedEquipment.category}</span>}
                  {selectedEquipment.availableQuantity != null && (
                    <span style={{ marginLeft: 8, opacity: .8 }}>· Available: {selectedEquipment.availableQuantity}</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Cart */}
          <div className="to-section-hd">
            <div className="to-section-title">Request Items</div>
            <span style={{ fontSize: 12, color: "var(--to-text-muted)" }}>
              {items.length} item{items.length !== 1 ? "s" : ""} added
            </span>
          </div>

          <div className="to-item-list">
            <div className="to-item-list-hd">Equipment · Quantity · Actions</div>
            {items.length === 0 && (
              <div className="to-item-empty">
                No items added yet — select equipment above and click "Add to Request"
              </div>
            )}
            {items.map(it => (
              <div key={it.equipmentId} className="to-item-row">
                <div>
                  <div className="to-item-name">{it.equipmentName}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    className="to-input"
                    type="number"
                    min="1"
                    value={it.quantity}
                    onChange={e => updateQty(it.equipmentId, e.target.value)}
                    style={{ width: 70 }}
                    disabled={submitting}
                  />
                  <span className="to-muted" style={{ fontSize: 13 }}>units</span>
                  <button
                    className="to-btn to-btn-ghost to-btn-sm"
                    onClick={() => removeItem(it.equipmentId)}
                    disabled={submitting}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          {items.length > 0 && (
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
              <button
                className="to-btn to-btn-ghost"
                onClick={() => setItems([])}
                disabled={submitting}
              >
                Clear All
              </button>
              <button
                className="to-btn to-btn-primary"
                onClick={submit}
                disabled={submitting || items.length === 0}
              >
                {submitting ? "Submitting…" : `Submit Request (${items.length} item${items.length !== 1 ? "s" : ""})`}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}