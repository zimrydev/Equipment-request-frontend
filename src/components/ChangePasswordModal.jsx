import { useState } from "react"
import { AuthAPI } from "../api/api"

// ⚠ REQUIRES BACKEND ENDPOINT: POST /api/auth/change-password { currentPassword, newPassword }
// This endpoint does NOT currently exist in the backend. Until it is added, this modal
// will show a friendly error telling the user to use the Forgot Password flow instead.
// Once you add the endpoint to AuthController, remove the MISSING_ENDPOINT block below.

const MISSING_ENDPOINT = true  // ← Set to false once backend endpoint is added

const strongPattern = /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}/

export default function ChangePasswordModal({ onClose }) {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword,     setNewPassword]     = useState("")
  const [confirm,         setConfirm]         = useState("")
  const [error,           setError]           = useState("")
  const [success,         setSuccess]         = useState("")
  const [loading,         setLoading]         = useState(false)

  const isWeak     = newPassword.length > 0 && !strongPattern.test(newPassword)
  const isMismatch = confirm.length > 0 && newPassword !== confirm

  const handleSubmit = async () => {
    setError(""); setSuccess("")

    if (MISSING_ENDPOINT) {
      setError(
        "In-app password change is not yet available. Please use 'Forgot Password' on the login page to reset your password via email."
      )
      return
    }

    if (!currentPassword || !newPassword || !confirm) {
      setError("Please fill all fields")
      return
    }
    if (!strongPattern.test(newPassword)) {
      setError("New password must be 8+ characters with uppercase, lowercase, number and special character")
      return
    }
    if (newPassword !== confirm) {
      setError("Passwords do not match")
      return
    }
    if (newPassword === currentPassword) {
      setError("New password must be different from your current password")
      return
    }

    try {
      setLoading(true)
      await AuthAPI.changePassword({ currentPassword, newPassword })
      setSuccess("Password changed successfully!")
      setCurrentPassword(""); setNewPassword(""); setConfirm("")
    } catch (err) {
      setError(err?.message || "Password change failed. Please check your current password.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="overlay">
      <div className="overlay-box" style={{ maxWidth: 500 }}>
        <h2>Change Password</h2>

        {MISSING_ENDPOINT && (
          <div style={{
            padding: "12px 14px", background: "#fffbeb", border: "1px solid #fde68a",
            borderRadius: 8, fontSize: 13, color: "#92400e", lineHeight: 1.6, marginBottom: 16,
          }}>
            <strong>⚠ Feature pending:</strong> In-app password change requires a backend endpoint
            (<code>/api/auth/change-password</code>) that has not been implemented yet.
            Use <strong>Forgot Password</strong> on the login page to reset via email.
          </div>
        )}

        {!MISSING_ENDPOINT && (
          <>
            <div className="form-group">
              <label>Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                disabled={loading}
              />
              {isWeak && (
                <small style={{ color: "red", fontSize: 11, display: "block", marginTop: 4 }}>
                  Must be 8+ chars with uppercase, lowercase, number &amp; special character
                </small>
              )}
            </div>

            <div className="form-group">
              <label>Confirm New Password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                disabled={loading}
              />
              {isMismatch && (
                <small style={{ color: "red", fontSize: 11, display: "block", marginTop: 4 }}>
                  Passwords do not match
                </small>
              )}
            </div>
          </>
        )}

        {error   && <p style={{ color: "red",    fontSize: 12, marginTop: 8 }}>⚠ {error}</p>}
        {success && <p style={{ color: "#16a34a", fontSize: 12, marginTop: 8 }}>✓ {success}</p>}

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          {!MISSING_ENDPOINT && (
            <button
              onClick={handleSubmit}
              disabled={loading || isWeak || isMismatch}
              style={{ flex: 1 }}
            >
              {loading ? "Updating…" : "Update Password"}
            </button>
          )}
          <button
            onClick={onClose}
            className="btn-cancel"
            type="button"
            style={{ flex: 1 }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}