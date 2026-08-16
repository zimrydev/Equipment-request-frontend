import { BrowserRouter, Routes, Route } from "react-router-dom"
import { RequestProvider } from "./context/RequestContext"

// Public
import Home from "./pages/Home"
import LoginSignup from "./pages/LoginSignup"
import ResetPassword from "./pages/ResetPassword"
import VerifyEmail from "./pages/VerifyEmail"   // NEW

// Student
import StudentDashboard from "./pages/StudentDashboard"
import NewRequest from "./pages/NewRequest"
import ViewRequests from "./pages/ViewRequests"
import History from "./pages/History"

// Instructor / Staff  (re-enabled — uses same student pages)
import InstructorDashboard from "./pages/InstructorDashboard"
import InstructorNewRequest from "./pages/InstructorNewRequest"
import InstructorViewRequests from "./pages/InstructorViewRequests"
import InstructorHistory from "./pages/InstructorHistory"

// Lecturer
import LecturerDashboard from "./pages/LecturerDashboard"
import LecturerApplications from "./pages/LecturerApplications"
import LecturerNewRequest from "./pages/LecturerNewRequest"
import LecturerViewRequests from "./pages/LecturerViewRequests"
import LecturerHistory from "./pages/LecturerHistory"

// Technical Officer (TO)  — removed dead /to-view-requests route
import TODashboard from "./pages/TODashboard"
import TOApprovalRequests from "./pages/TOApprovalRequests"
import TOPurchase from "./pages/TOPurchase"
import TOPurchaseNew from "./pages/TOPurchaseNew"
import TOHistory from "./pages/TOHistory"

// HOD
import HodDashboard from "./pages/HodDashboard"
import HodMyWork from "./pages/HodMyWork"
import HodDeptWork from "./pages/HodDeptWork"
import HodInventory from "./pages/HodInventory"
import HodLabManagement from "./pages/HodLabManagement"   // NEW
import HodReport from "./pages/HodReport"
import HodReportLab from "./pages/HodReportLab"
import HodDeptPurchase from "./pages/HodDeptPurchase"
import HodHistory from "./pages/HodHistory"
import HodInspect from "./pages/HodInspect"

// Admin
import AdminDashboard from "./pages/AdminDashboard"
import AdminDepartment from "./pages/AdminDepartment"
import AdminViewRequests from "./pages/AdminViewRequests"
import AdminUsers from "./pages/AdminUsers"
import AdminReport from "./pages/AdminReport"
import AdminHistory from "./pages/AdminHistory"

// Common
import Help from "./pages/Help"
import Settings from "./pages/Settings"

function App() {
  return (
    <RequestProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<LoginSignup />} />
          <Route path="/signup" element={<LoginSignup />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />   {/* NEW */}

          {/* STUDENT */}
          <Route path="/student-dashboard" element={<StudentDashboard />} />
          <Route path="/new-request" element={<NewRequest />} />
          <Route path="/view-requests" element={<ViewRequests />} />
          <Route path="/history" element={<History />} />

          {/* INSTRUCTOR / STAFF — re-enabled */}
          <Route path="/instructor-dashboard" element={<InstructorDashboard />} />
          <Route path="/instructor-new-request" element={<InstructorNewRequest />} />
          <Route path="/instructor-view-requests" element={<InstructorViewRequests />} />
          <Route path="/instructor-history" element={<InstructorHistory />} />

          {/* LECTURER */}
          <Route path="/lecturer-dashboard" element={<LecturerDashboard />} />
          <Route path="/lecturer-applications" element={<LecturerApplications />} />
          <Route path="/lecturer-new-request" element={<LecturerNewRequest />} />
          <Route path="/lecturer-view-requests" element={<LecturerViewRequests />} />
          <Route path="/lecturer-history" element={<LecturerHistory />} />

          {/* TECHNICAL OFFICER — /to-view-requests REMOVED (dead route) */}
          <Route path="/to-dashboard" element={<TODashboard />} />
          <Route path="/to-approval-requests" element={<TOApprovalRequests />} />
          <Route path="/to-purchase" element={<TOPurchase />} />
          <Route path="/to-purchase-new" element={<TOPurchaseNew />} />
          <Route path="/to-history" element={<TOHistory />} />

          {/* HOD */}
          <Route path="/hod-dashboard" element={<HodDashboard />} />
          <Route path="/hod-my-work" element={<HodMyWork />} />
          <Route path="/hod-dept-work" element={<HodDeptWork />} />
          <Route path="/hod-inventory" element={<HodInventory />} />
          <Route path="/hod-labs" element={<HodLabManagement />} />        {/* NEW */}
          <Route path="/hod-report" element={<HodReport />} />
          <Route path="/hod-report-lab/:labId" element={<HodReportLab />} />
          <Route path="/hod-dept-purchase" element={<HodDeptPurchase />} />
          <Route path="/hod-history" element={<HodHistory />} />
          <Route path="/hod-inspect" element={<HodInspect />} />

          {/* ADMIN */}
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/admin-department" element={<AdminDepartment />} />
          <Route path="/admin-view-requests" element={<AdminViewRequests />} />
          <Route path="/admin-users" element={<AdminUsers />} />
          <Route path="/admin-report" element={<AdminReport />} />
          <Route path="/admin-history" element={<AdminHistory />} />

          {/* COMMON */}
          <Route path="/help" element={<Help />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </BrowserRouter>
    </RequestProvider>
  )
}

export default App