import { Navigate, Route, Routes } from "react-router-dom";

import "./css/ui-fixes.css";

import MainLayout from "./Components/layout/MainLayout";
import ProtectedRoute from "./Components/auth/ProtectedRoute";
import PermissionRoute from "./Components/auth/PermissionRoute";

import Home from "./Pages/Home/Home";
import BrowseNotes from "./Pages/BrowseNotes/BrowseNotes";
import BrowsePYQs from "./Pages/BrowsePYQs/BrowsePYQs";
import Upload from "./Pages/Upload/Upload";
import MyUploads from "./Pages/MyUploads/MyUploads";
import Profile from "./Pages/Profile/Profile";
import Splash from "./Pages/Splash/Splash";
import Login from "./Pages/Auth/Login";
import Signup from "./Pages/Auth/Signup";
import VerifyEmail from "./Pages/Auth/VerifyEmail";

import TeacherDashboard from "./Pages/Teacher/TeacherDashboard";
import AdminDashboard from "./Pages/Admin/AdminDashboard";
import TeacherApprovals from "./Pages/Admin/TeacherApprovals";
import ResourceApprovals from "./Pages/Admin/ResourceApprovals";

function App() {
  return (
    <Routes>
      {/* Public pages */}
      <Route path="/splash" element={<Splash />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/verify-email" element={<VerifyEmail />} />

      {/* Main application layout */}
      <Route element={<MainLayout />}>
        <Route path="/home" element={<Home />} />
        <Route path="/browse-notes" element={<BrowseNotes />} />

        {/* Signed-in users only (the backend enforces this as well) */}
        <Route element={<PermissionRoute permission="viewPYQs" />}>
          <Route path="/browse-pyqs" element={<BrowsePYQs />} />
        </Route>

        <Route element={<PermissionRoute permission="uploadNotes" />}>
          <Route path="/upload" element={<Upload />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/profile" element={<Profile />} />
          <Route path="/my-uploads" element={<MyUploads />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["teacher"]} />}>
          <Route
            path="/teacher/dashboard"
            element={<TeacherDashboard />}
          />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/resources" element={<ResourceApprovals />} />
          <Route path="/admin/teachers" element={<TeacherApprovals />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}

export default App;