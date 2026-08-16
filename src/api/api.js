// ERMS API — Spring Boot backend (JWT auth)
// Dev: Vite proxy in vite.config.js forwards /api → http://localhost:8080
// Prod: Set VITE_API_BASE_URL="https://your-domain.com"

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "")

export function getAuthToken() {
  return localStorage.getItem("token") || ""
}

export async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`
  const token = getAuthToken()

  const headers = new Headers(options.headers || {})
  if (!headers.has("Content-Type") && options.body) headers.set("Content-Type", "application/json")
  if (token) headers.set("Authorization", `Bearer ${token}`)

  const res = await fetch(url, { ...options, headers })

  const contentType = res.headers.get("content-type") || ""
  const isJson = contentType.includes("application/json")
  const data = isJson ? await res.json().catch(() => null) : await res.text().catch(() => "")

  if (!res.ok) {
    const message =
      (typeof data === "string" && data) ||
      (data && (data.message || data.error)) ||
      `Request failed (${res.status})`
    const err = new Error(message)
    err.status = res.status
    err.data = data
    throw err
  }

  return data
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const AuthAPI = {
  login: (email, password) =>
    apiFetch("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),

  // Backend expects: fullName, email, regNo, department, password
  // Email must match regNo: 2022/E/063 → 2022e063@eng.jfn.ac.lk
  signupStudent: ({ fullName, email, regNo, department, password }) =>
    apiFetch("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ fullName, email, regNo, department, password }),
    }),

  forgotPassword: (email) =>
    apiFetch("/api/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),

  resetPassword: ({ token, newPassword }) =>
    apiFetch("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, newPassword }),
    }),

  // Returns: { id, fullName, email, regNo, department, role, enabled }
  me: () => apiFetch("/api/auth/me"),

  changePassword: ({ currentPassword, newPassword }) =>
    apiFetch("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
  // NOTE: /api/auth/change-password does NOT exist in the backend.
  // To change password, the user must use forgotPassword (email reset flow).
  // If you want in-app change-password, add a backend endpoint first:
  //   POST /api/auth/change-password  { currentPassword, newPassword }
  // changePassword: ({ currentPassword, newPassword }) => apiFetch(...)  ← ADD TO BACKEND FIRST
}

// ── Notifications ─────────────────────────────────────────────────────────────
// Returns: NotificationDTO[] { id, type, title, message, relatedRequestId, relatedPurchaseId, createdAt, readFlag }
export const NotificationAPI = {
  my: () => apiFetch("/api/notifications/my"),
  markRead: (id) => apiFetch(`/api/notifications/${id}/read`, { method: "POST" }),
}

// ── Common lookups ────────────────────────────────────────────────────────────
export const CommonAPI = {
  // Returns: UserPublicDTO[] { id, email, fullName, role, department }
  // Includes LECTURER and HOD roles for the given department
  lecturers: (department) =>
    apiFetch(`/api/common/lecturers?department=${encodeURIComponent(department || "")}`),

  // Returns: LabDTO[] { id, name, department, technicalOfficerId }
  labs: async (department) => {
    try {
      const qs = department ? `?department=${encodeURIComponent(department)}` : ""
      return await apiFetch(`/api/common/labs${qs}`)
    } catch (e) {
      if (e?.status === 404) return null
      throw e
    }
  },

  // Returns: EquipmentPublicDTO[] { id, name, category, itemType, totalQty, availableQty, active, labId }
  equipmentByLab: async (labId) => {
    try {
      return await apiFetch(`/api/common/equipment?labId=${encodeURIComponent(labId)}`)
    } catch (e) {
      if (e?.status === 404) return null
      throw e
    }
  },
}

// ── Requests (Student / Staff) ────────────────────────────────────────────────
// Roles allowed: STUDENT, STAFF (and LECTURER/HOD for their own requests via same endpoint)
export const StudentRequestAPI = {
  // POST /api/student/requests
  // Body: { labId, lecturerId, purpose, purposeNote, fromDate, toDate, items: [{equipmentId, quantity}] }
  create: (payload) =>
    apiFetch("/api/student/requests", { method: "POST", body: JSON.stringify(payload) }),

  // GET /api/student/requests → StudentMyRequestDTO[]
  my: () => apiFetch("/api/student/requests"),

  // POST /api/student/requests/{id}/accept-issue  (all items at once)
  acceptIssue: (id) => apiFetch(`/api/student/requests/${id}/accept-issue`, { method: "POST" }),

  // POST /api/student/request-items/{id}/accept-issue  (single item)
  acceptIssueItem: (requestItemId) =>
    apiFetch(`/api/student/request-items/${requestItemId}/accept-issue`, { method: "POST" }),

  // POST /api/student/requests/{id}/return  (all returnable items at once)
  submitReturn: (id) => apiFetch(`/api/student/requests/${id}/return`, { method: "POST" }),

  // POST /api/student/request-items/{id}/return  (single item)
  submitReturnItem: (requestItemId) =>
    apiFetch(`/api/student/request-items/${requestItemId}/return`, { method: "POST" }),
}

// ── Lecturer ──────────────────────────────────────────────────────────────────
export const LecturerRequestAPI = {
  // GET /api/lecturer/approval-queue → RequestSummaryDTO[]
  queue: () => apiFetch("/api/lecturer/approval-queue"),

  // POST /api/lecturer/requests/{id}/approve
  approve: (id) => apiFetch(`/api/lecturer/requests/${id}/approve`, { method: "POST" }),

  // POST /api/lecturer/request-items/{id}/approve  (per-item)
  approveItem: (requestItemId) =>
    apiFetch(`/api/lecturer/request-items/${requestItemId}/approve`, { method: "POST" }),

  // POST /api/lecturer/requests/{id}/reject?reason=...
  reject: (id, reason) =>
    apiFetch(
      `/api/lecturer/requests/${id}/reject${reason ? `?reason=${encodeURIComponent(reason)}` : ""}`,
      { method: "POST" }
    ),

  // POST /api/lecturer/request-items/{id}/reject?reason=...  (per-item)
  rejectItem: (requestItemId, reason) =>
    apiFetch(
      `/api/lecturer/request-items/${requestItemId}/reject${reason ? `?reason=${encodeURIComponent(reason)}` : ""}`,
      { method: "POST" }
    ),

  // GET /api/lecturer/my-requests → StudentMyRequestDTO[]
  // Returns lecturer's OWN requests (lecturer can also request equipment)
  my: () => apiFetch("/api/lecturer/my-requests"),
}

// ── Technical Officer ─────────────────────────────────────────────────────────
export const ToRequestAPI = {
  // GET /api/to/requests → RequestSummaryDTO[]  (all requests in TO's lab)
  all: () => apiFetch("/api/to/requests"),

  // GET /api/to/approved-requests?labId=X → ToApprovedRequestDTO[]
  approvedByLab: (labId) => apiFetch(`/api/to/approved-requests?labId=${encodeURIComponent(labId)}`),

  // POST /api/to/requests/{id}/issue  (issue all items in request)
  issue: (id) => apiFetch(`/api/to/requests/${id}/issue`, { method: "POST" }),

  // POST /api/to/request-items/{id}/issue  (issue single item)
  issueItem: (requestItemId) =>
    apiFetch(`/api/to/request-items/${requestItemId}/issue`, { method: "POST" }),

  // POST /api/to/request-items/{id}/wait?reason=...
  waitItem: (requestItemId, reason = "") =>
    apiFetch(
      `/api/to/request-items/${requestItemId}/wait?reason=${encodeURIComponent(reason)}`,
      { method: "POST" }
    ),

  // POST /api/to/requests/{id}/verify-return?damaged=true|false
  verifyReturn: (id, damaged = false) =>
    apiFetch(`/api/to/requests/${id}/verify-return?damaged=${damaged}`, { method: "POST" }),

  // POST /api/to/request-items/{id}/verify-return?damaged=true|false
  verifyReturnItem: (requestItemId, damaged = false) =>
    apiFetch(`/api/to/request-items/${requestItemId}/verify-return?damaged=${damaged}`, { method: "POST" }),
}

// ── Admin ─────────────────────────────────────────────────────────────────────
export const AdminAPI = {
  // GET /api/admin/departments → String[]
  departments: () => apiFetch("/api/admin/departments"),

  // GET /api/admin/departments/{dept}/users → AdminDepartmentUsersDTO
  departmentUsers: (dept) => apiFetch(`/api/admin/departments/${encodeURIComponent(dept)}/users`),

  // POST /api/admin/users/{role}  Body: { fullName, email, department, password, [regNo] }
  createHod:      (payload) => apiFetch("/api/admin/users/hod",      { method: "POST", body: JSON.stringify(payload) }),
  createLecturer: (payload) => apiFetch("/api/admin/users/lecturer", { method: "POST", body: JSON.stringify(payload) }),
  createStaff:    (payload) => apiFetch("/api/admin/users/staff",    { method: "POST", body: JSON.stringify(payload) }),
  createTo:       (payload) => apiFetch("/api/admin/users/to",       { method: "POST", body: JSON.stringify(payload) }),
  createStudent:  (payload) => apiFetch("/api/admin/users/student",  { method: "POST", body: JSON.stringify(payload) }),

  // PUT /api/admin/users/{id}
  updateUser: (id, payload) =>
    apiFetch(`/api/admin/users/${id}`, { method: "PUT", body: JSON.stringify(payload) }),

  // DELETE /api/admin/users/{id}
  deleteUser: (id) => apiFetch(`/api/admin/users/${id}`, { method: "DELETE" }),

  // POST /api/admin/users/{id}/disable
  disableUser: (id) => apiFetch(`/api/admin/users/${id}/disable`, { method: "POST" }),

  // POST /api/admin/users/{id}/enable — re-activates a disabled user
  enableUser: (id) => apiFetch(`/api/admin/users/${id}/enable`, { method: "POST" }),
}

// ── HOD Department ────────────────────────────────────────────────────────────
export const HodDepartmentAPI = {
  // GET /api/hod/department/requests → HodDeptRequestDTO[]
  requests: () => apiFetch("/api/hod/department/requests"),
}

// ── HOD Lab Management ────────────────────────────────────────────────────────
export const HodLabAPI = {
  // GET /api/hod/labs → LabDTO[]
  labs: () => apiFetch("/api/hod/labs"),

  // GET /api/hod/labs/department-tos → SimpleUserDTO[]
  // HOD-secured endpoint — returns all TOs in the HOD's dept, no emailVerified filter.
  deptTOs: () => apiFetch("/api/hod/labs/department-tos"),

  // POST /api/hod/labs/{labId}/assign-to?toUserId=X
  assignTo: (labId, toUserId) =>
    apiFetch(`/api/hod/labs/${labId}/assign-to?toUserId=${encodeURIComponent(toUserId)}`, {
      method: "POST",
    }),

  // POST /api/hod/labs/{labId}/clear-to
  clearTo: (labId) => apiFetch(`/api/hod/labs/${labId}/clear-to`, { method: "POST" }),
}

// ── TO Purchase ───────────────────────────────────────────────────────────────
export const ToPurchaseAPI = {
  // POST /api/to/purchase-requests
  submit: (payload) =>
    apiFetch("/api/to/purchase-requests", { method: "POST", body: JSON.stringify(payload) }),

  // GET /api/to/purchase-requests/my → PurchaseRequestSummaryDTO[]
  my: () => apiFetch("/api/to/purchase-requests/my"),
}

// ── HOD Purchase ──────────────────────────────────────────────────────────────
export const HodPurchaseAPI = {
  // GET /api/hod/purchase-requests → HodPurchaseRequestDTO[] (pending from TOs in dept)
  pending: () => apiFetch("/api/hod/purchase-requests"),

  // POST /api/hod/purchase-requests/{id}/decision  Body: { approve: bool, comment: string }
  decision: ({ id, approve, comment }) =>
    apiFetch(`/api/hod/purchase-requests/${id}/decision`, {
      method: "POST",
      body: JSON.stringify({ approve: !!approve, comment: comment || "" }),
    }),

  // GET /api/hod/purchase-requests/my → PurchaseRequestSummaryDTO[]
  my: () => apiFetch("/api/hod/purchase-requests/my"),

  // POST /api/hod/purchase-requests/{id}/receive
  receive: (id) => apiFetch(`/api/hod/purchase-requests/${id}/receive`, { method: "POST" }),
}

// ── Admin Purchase ────────────────────────────────────────────────────────────
export const AdminPurchaseAPI = {
  // GET /api/admin/departments/{dept}/purchase-requests
  pendingByDept: (dept) =>
    apiFetch(`/api/admin/departments/${encodeURIComponent(dept)}/purchase-requests`),

  // GET /api/admin/departments/{dept}/purchase-report
  reportByDept: (dept) =>
    apiFetch(`/api/admin/departments/${encodeURIComponent(dept)}/purchase-report`),

  // GET /api/admin/departments/{dept}/purchase-history
  historyByDept: (dept) =>
    apiFetch(`/api/admin/departments/${encodeURIComponent(dept)}/purchase-history`),

  // POST /api/admin/departments/{dept}/purchase-requests/{id}/approve?issuedDate=YYYY-MM-DD&comment=...
  approve: ({ dept, id, issuedDate, comment }) => {
    if (!issuedDate) throw new Error("issuedDate is required")
    const qs = new URLSearchParams()
    qs.set("issuedDate", issuedDate)
    if (comment) qs.set("comment", comment)
    return apiFetch(
      `/api/admin/departments/${encodeURIComponent(dept)}/purchase-requests/${id}/approve?${qs}`,
      { method: "POST" }
    )
  },

  // POST /api/admin/departments/{dept}/purchase-requests/{id}/reject?reason=...
  reject: ({ dept, id, reason }) =>
    apiFetch(
      `/api/admin/departments/${encodeURIComponent(dept)}/purchase-requests/${id}/reject${reason ? `?reason=${encodeURIComponent(reason)}` : ""}`,
      { method: "POST" }
    ),
}