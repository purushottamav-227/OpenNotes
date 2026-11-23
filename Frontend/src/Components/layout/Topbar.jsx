import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell,
  ChevronDown,
  LogIn,
  LogOut,
  Menu,
  Moon,
  Settings,
  Sun,
  UserRound,
} from "lucide-react";
import { useTheme } from "../../context/useTheme";
import useAuth from "../../context/useAuth";
import Logo from "../common/Logo";

function getInitials(name = "") {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("") || "U"
  );
}

function Topbar({ onMenuClick }) {
  const { theme, toggleTheme } = useTheme();
  const { currentUser, isAuthenticated, role, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  const displayName = currentUser?.name || "Guest";
  const email = currentUser?.email || "";
  const profileImage = currentUser?.profileImage || "";
  const initials = getInitials(displayName);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    const closeOnEscape = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  useEffect(() => {
    const updateProfile = () => setMenuOpen(false);
    window.addEventListener("openNotesProfileUpdated", updateProfile);
    return () => window.removeEventListener("openNotesProfileUpdated", updateProfile);
  }, []);

  const goToProfile = () => {
    setMenuOpen(false);
    navigate("/profile");
  };

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate("/home", { replace: true });
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="menu-button"
          onClick={onMenuClick}
          aria-label="Open navigation"
        >
          <Menu size={24} />
        </button>

        <Link to="/home" className="mobile-logo" aria-label="OpenNotes home">
          <Logo />
        </Link>
      </div>

      <div className="topbar-actions">
        <button
          type="button"
          className="topbar-icon-button"
          aria-label="Notifications"
          title="Notifications"
          onClick={() => {}}
        >
          <Bell size={20} />
        </button>

        <button
          type="button"
          className="topbar-icon-button"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          title="Toggle theme"
        >
          {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <div className="topbar-account" ref={menuRef}>
          {isAuthenticated ? (
            <button
              type="button"
              className="topbar-account-trigger"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-label="Open account menu"
            >
              <span className="topbar-avatar">
                {profileImage ? <img src={profileImage} alt="" /> : initials}
              </span>

              <span className="topbar-account-text">
                <strong>{displayName}</strong>
                <small>{role}</small>
              </span>

              <ChevronDown
                size={16}
                className={menuOpen ? "account-chevron-open" : ""}
              />
            </button>
          ) : (
            <div className="topbar-guest-actions">
              <span className="topbar-guest-label">Guest</span>
              <Link className="topbar-signin-button" to="/login">
                Sign in
              </Link>
            </div>
          )}

          {isAuthenticated && menuOpen && (
            <div className="topbar-account-menu" role="menu">
              <div className="topbar-menu-identity">
                <span className="topbar-avatar topbar-avatar-large">
                  {profileImage ? <img src={profileImage} alt="" /> : initials}
                </span>

                <div>
                  <strong>{displayName}</strong>
                  <span>{email}</span>
                  <small>{role}</small>
                </div>
              </div>

              <div className="topbar-menu-divider" />

              <button
                type="button"
                className="topbar-menu-item"
                role="menuitem"
                onClick={goToProfile}
              >
                <UserRound size={17} />
                My Profile & Workspace
              </button>

              <button
                type="button"
                className="topbar-menu-item"
                role="menuitem"
                onClick={goToProfile}
              >
                <Settings size={17} />
                Account settings
              </button>

              <div className="topbar-menu-divider" />

              <button
                type="button"
                className="topbar-menu-item topbar-logout-item"
                role="menuitem"
                onClick={handleLogout}
              >
                <LogOut size={17} />
                Sign out
              </button>
            </div>
          )}
        </div>

        {!isAuthenticated && (
          <Link
            to="/login"
            className="topbar-mobile-signin"
            aria-label="Sign in"
          >
            <LogIn size={19} />
          </Link>
        )}
      </div>
    </header>
  );
}

export default Topbar;
