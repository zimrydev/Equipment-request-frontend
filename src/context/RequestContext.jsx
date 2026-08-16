import { createContext, useContext, useMemo, useState } from "react"
import { AuthAPI } from "../api/api"

const RequestContext = createContext()
export const useRequests = () => useContext(RequestContext)

export function RequestProvider({ children }) {
  // UI state used across pages
  const [requests,            setRequests]            = useState([])
  const [departments,         setDepartments]         = useState([
    { id: "CE",  name: "Computer Engineering",           isActive: true },
    { id: "EEE", name: "Electrical & Electronic Engineering", isActive: true },
  ])
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("CE")

  // Inventory (mock placeholder — replace with real API when backend inventory endpoint is added)
  const [inventory, setInventory] = useState([
    { id: "INV-1", departmentId: "CE",  location: "Lab 01",     equipment: "Arduino Uno",      available: 10 },
    { id: "INV-2", departmentId: "CE",  location: "Lab 01",     equipment: "ESP32",            available: 8  },
    { id: "INV-3", departmentId: "CE",  location: "Lab 02",     equipment: "Ultrasonic Sensor",available: 20 },
    { id: "INV-4", departmentId: "EEE", location: "Power Lab",  equipment: "Transformer",      available: 4  },
    { id: "INV-5", departmentId: "EEE", location: "Circuit Lab",equipment: "Breadboard",       available: 30 },
  ])

  const [purchaseRequests, setPurchaseRequests] = useState([])

  // Admin user management state (used by AdminUsers page)
  const [users, setUsers] = useState({
    hod: { id: "HOD-1", name: "HOD", email: "hod@uni.lk", exists: true },
    tos: [{ id: "TO-1", name: "TO", email: "to@uni.lk" }],
    students: [{ id: "ST-1", name: "Student", email: "student@uni.lk" }],
    instructors: [{ id: "IN-1", name: "Instructor", email: "instructor@uni.lk" }],
  })

  const normalizeEmail = (v) => (v || "").toLowerCase().trim()

  // Role → dashboard path
  const roleRedirect = (role) => {
    switch ((role || "").toLowerCase()) {
      case "student":    return "/student-dashboard"
      case "staff":      return "/instructor-dashboard"  // STAFF uses instructor pages
      case "instructor": return "/instructor-dashboard"
      case "lecturer":   return "/lecturer-dashboard"
      case "to":         return "/to-dashboard"
      case "hod":        return "/hod-my-work"
      case "admin":      return "/admin-dashboard"
      default:           return "/login"
    }
  }

  // ── authenticate: calls AuthAPI.login, stores token + role ──
  const authenticate = async (email, password) => {
    const data = await AuthAPI.login(normalizeEmail(email), password)
    // data: { message, token, email, role }
    if (!data?.token || !data?.role) throw new Error("Invalid login response")
    localStorage.setItem("token", data.token)
    localStorage.setItem("role", data.role.toLowerCase())
    return { role: data.role.toLowerCase(), email: data.email }
  }

  // ── registerStudent: calls AuthAPI.signupStudent ──
  // Backend expects: fullName, email, regNo, department, password
  const registerStudent = async ({ name, fullName, email, regNo, department, password }) => {
    // Support both `name` and `fullName` for backwards compatibility
    const resolvedName = fullName || name
    if (!resolvedName) throw new Error("Full name is required")
    await AuthAPI.signupStudent({ fullName: resolvedName, email, regNo, department, password })
    return { ok: true }
  }

  // ── requestPasswordReset: calls AuthAPI.forgotPassword ──
  const requestPasswordReset = async ({ email }) => {
    const e = normalizeEmail(email)
    if (!e) return { ok: false, message: "Email is required" }
    await AuthAPI.forgotPassword(e)
    return { ok: true, message: "If this email exists, a reset link has been sent." }
  }

  // ── resetPasswordWithToken: calls AuthAPI.resetPassword ──
  const resetPasswordWithToken = async ({ token, newPassword }) => {
    if (!token)       return { ok: false, message: "Token is required" }
    if (!newPassword) return { ok: false, message: "New password is required" }
    await AuthAPI.resetPassword({ token, newPassword })
    return { ok: true, message: "Password reset successfully." }
  }

  // NOTE: changePassword (in-app) is NOT available because the backend endpoint
  // POST /api/auth/change-password does not exist yet.
  // Add it to AuthController first, then uncomment the AuthAPI.changePassword call in api.js
  // and implement a real changePassword function here.

  const value = useMemo(() => ({
    // State
    requests, setRequests,
    departments, setDepartments,
    selectedDepartmentId, setSelectedDepartmentId,
    inventory, setInventory,
    purchaseRequests, setPurchaseRequests,
    users, setUsers,

    // Auth actions
    authenticate,
    registerStudent,
    requestPasswordReset,
    resetPasswordWithToken,
    roleRedirect,
  }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [requests, departments, selectedDepartmentId, inventory, purchaseRequests, users])

  return (
    <RequestContext.Provider value={value}>
      {children}
    </RequestContext.Provider>
  )
}