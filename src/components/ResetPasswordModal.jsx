import { useState } from "react"

export default function ResetPasswordModal({ onClose }) {
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = () => {
    const pattern =
      /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/

    if (!pattern.test(password)) {
      setError(
        "Password must be 8+ chars, 1 uppercase, 1 number, 1 special char"
      )
      return
    }

    if (password !== confirm) {
      setError("Passwords do not match")
      return
    }

    alert("Password reset successful!")
    onClose()
  }

  return (
    <div className="overlay">
      <div className="overlay-box">
        <h2>Set New Password</h2>

        <label>New Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <label>Confirm Password</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />

        {error && <p style={{ color: "red", fontSize: "12px" }}>{error}</p>}

        <button onClick={handleSubmit}>Reset Password</button>

        <p className="close-link" onClick={onClose}>
          Cancel
        </p>
      </div>
    </div>
  )
}
