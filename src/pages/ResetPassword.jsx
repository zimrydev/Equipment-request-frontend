import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { AuthAPI } from "../api/api"
import "../styles/auth.css"

const strongPattern = /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}/

export default function ResetPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token")

  const [newPassword, setNewPassword]   = useState("")
  const [confirm,     setConfirm]       = useState("")
  const [error,       setError]         = useState("")
  const [success,     setSuccess]       = useState("")
  const [loading,     setLoading]       = useState(false)

  const isWeak     = newPassword.length > 0 && !strongPattern.test(newPassword)
  const isMismatch = confirm.length > 0 && newPassword !== confirm

  useEffect(() => {
    if (!token) {
      setError("No reset token found. Please use the link from your email.")
    }
  }, [token])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!token) {
      setError("No reset token. Please use the link from your email.")
      return
    }
    if (!newPassword || !confirm) {
      setError("Please fill all fields")
      return
    }
    if (!strongPattern.test(newPassword)) {
      setError("Password must be 8+ characters with uppercase, lowercase, number and special character (@$!%*?&)")
      return
    }
    if (newPassword !== confirm) {
      setError("Passwords do not match")
      return
    }

    try {
      setLoading(true)
      // POST /api/auth/reset-password  { token, newPassword }
      await AuthAPI.resetPassword({ token, newPassword })
      setSuccess("Password reset successfully! Redirecting to login…")
      setTimeout(() => navigate("/login"), 2000)
    } catch (err) {
      setError(err?.message || "Reset failed. The link may have expired. Please request a new one.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <img src="/images/logo.png" alt="Logo" />
        </div>
        <h2>Set New Password</h2>
        <p className="auth-sub">Enter your new password below.</p>

        {!token ? (
          <div className="auth-error">
            ⚠ No reset token found. Please use the link from your email or{" "}
            <span className="auth-link" onClick={() => navigate("/login")}>go back to login</span>.
          </div>
        ) : success ? (
          <div className="auth-success">✓ {success}</div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Min 8 chars, uppercase, number, symbol"
                disabled={loading}
              />
              {isWeak && (
                <small className="field-error">
                  Must be 8+ characters with uppercase, lowercase, number &amp; special character
                </small>
              )}
            </div>

            <div className="form-group">
              <label>Confirm New Password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Confirm your new password"
                disabled={loading}
              />
              {isMismatch && (
                <small className="field-error">Passwords do not match</small>
              )}
            </div>

            <div className="auth-pwd-req">
              Password requirements: 8+ characters · uppercase &amp; lowercase · number · special character (@$!%*?&amp;)
            </div>

            {error && <div className="auth-error">⚠ {error}</div>}

            <button
              type="submit"
              className="btn-login"
              disabled={loading || isWeak || isMismatch || !newPassword || !confirm}
            >
              {loading ? "Resetting…" : "Reset Password"}
            </button>

            <p className="auth-link-row" onClick={() => navigate("/login")}>
              ← Back to Login
            </p>
          </form>
        )}
      </div>
    </div>
  )
}