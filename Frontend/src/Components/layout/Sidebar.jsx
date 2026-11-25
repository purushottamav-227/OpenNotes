import { NavLink } from "react-router-dom";
import {
  Home,
  BookOpen,
  FileQuestion,
  Upload,
  FolderOpen,
  ClipboardCheck,
  UserRound,
  ShieldCheck,
  Users,
  X,
  LogIn,
} from "lucide-react";

import Logo from "../common/Logo";
import useAuth from "../../context/useAuth";
import "../../css/sidebar.css";

const publicLinks = [
  { label: "Home", path: "/home", icon: Home },
  { label: "Browse Notes", path: "/browse-notes", icon: BookOpen },
];

const memberLinks = [
  ...publicLinks,
  { label: "Browse PYQs", path: "/browse-pyqs", icon: FileQuestion },
  { label: "Upload", path: "/upload", icon: Upload },
  { label: "My Uploads", path: "/my-uploads", icon: FolderOpen },
];

// No role has a dashboard. Each role opens straight into its own tools.
const linksByRole = {
  student: [...memberLinks, { label: "Profile", path: "/profile", icon: UserRound }],

  teacher: [
    ...memberLinks,
    { label: "Students", path: "/teacher/students", icon: Users },
    { label: "Profile", path: "/profile", icon: UserRound },
  ],

  // Admins moderate; they do not upload.
  admin: [
    ...publicLinks,
    { label: "Browse PYQs", path: "/browse-pyqs", icon: FileQuestion },
    {
      label: "Resource Approvals",
      path: "/admin/resources",
      icon: ClipboardCheck,
    },
    { label: "Teacher Approvals", path: "/admin/teachers", icon: ShieldCheck },
    { label: "Manage Accounts", path: "/admin/users", icon: Users },
    { label: "Profile", path: "/profile", icon: UserRound },
  ],
};

function Sidebar({ isOpen = false, onClose = () => {} }) {
  const { role } = useAuth();

  const links = linksByRole[role] || publicLinks;

  return (
    <>
      {isOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          onClick={onClose}
          aria-label="Close navigation"
        />
      )}

      <aside className={`app-sidebar ${isOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-logo">
            <Logo />
          </div>

          <p className="sidebar-tagline">Learn • Share • Grow</p>

          <button
            type="button"
            className="sidebar-mobile-close"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X size={19} />
          </button>
        </div>

        <div className="sidebar-nav-heading">MENU</div>

        <nav className="sidebar-nav">
          {links.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              onClick={onClose}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "active" : ""}`
              }
            >
              <Icon size={19} />
              <span>{label}</span>
            </NavLink>
          ))}

          {role === "guest" && (
            <NavLink
              to="/login"
              onClick={onClose}
              className={({ isActive }) =>
                `sidebar-link sidebar-login-link ${isActive ? "active" : ""}`
              }
            >
              <LogIn size={19} />
              <span>Sign in / Create account</span>
            </NavLink>
          )}
        </nav>

        <div className="sidebar-footer">
          <span className="sidebar-footer-title">OpenNotes</span>
          <span className="sidebar-footer-text">
            Learn together. Grow together.
          </span>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;