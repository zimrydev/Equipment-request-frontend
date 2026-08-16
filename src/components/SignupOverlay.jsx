import { useState } from "react";

function SignupOverlay({ onClose }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const strongPattern =
    /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}/;

  const isWeak = password && !strongPattern.test(password);

  return (
    <div className="overlay">
      <div className="overlay-box">
        <h2>Student Registration</h2>

        <form>
          <label>Full Name</label>
          <input type="text" required />

          <label>Registration Number</label>
          <input type="text" placeholder="2022/E/XXX" required />

          <label>Department</label>
          <select required>
            <option value="">-- Select Department --</option>
            <option value="CE">Computer Engineering</option>
            <option value="EEE">Electrical & Electronic Engineering</option>
          </select>

          <label>Email</label>
          <input
            type="email"
            pattern="20[0-9]{2}e[0-9]{3}@eng\.jfn\.ac\.lk"
            placeholder="20XXeXXX@eng.jfn.ac.lk"
            required
          />

          <label>Password</label>
          <input
            type="password"
            placeholder="Min 8 chars, Aa1@"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {isWeak && (
            <small className="error-text">
              Must be 8+ characters with uppercase, lowercase, number & symbol
            </small>
          )}

          <label>Confirm Password</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />

          <button type="submit">Register</button>
        </form>

        <p className="close-link" onClick={onClose}>
          Cancel
        </p>
      </div>
    </div>
  );
}

export default SignupOverlay;
