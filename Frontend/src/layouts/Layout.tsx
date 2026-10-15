import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { errorMessage } from "../utils/errors";
import { Feedback } from "../components/UI";
export function Layout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  const { user, loading, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function signOut() {
    setBusy(true);
    setError("");
    try {
      await logout();
      setOpen(false);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="site-header">
        <div className="nav-wrap">
          <Link to="/" className="brand" aria-label="Restivio home">
            <span className="brand-mark">r</span>restivio
            <span className="brand-dot">.</span>
          </Link>
          <button
            className="menu-button"
            aria-expanded={open}
            aria-label="Toggle navigation"
            onClick={() => setOpen(!open)}
          >
            ☰
          </button>
          <nav
            className={open ? "nav open" : "nav"}
            aria-label="Main navigation"
            onClick={() => setOpen(false)}
          >
            <NavLink to="/hotels">Hotels</NavLink>
            {user && <NavLink to="/bookings">My bookings</NavLink>}
            {user?.role === "HOTEL_MANAGER" && (
              <NavLink to="/manager">Manager dashboard</NavLink>
            )}
            {user?.role === "ADMIN" && (
              <NavLink to="/admin">Admin dashboard</NavLink>
            )}
            <span className="nav-divider" />
            {loading ? (
              <span className="muted">Restoring session…</span>
            ) : user ? (
              <>
                <span className="user-label">
                  <span className="avatar">{user.name.slice(0, 1)}</span>
                  {user.name}
                </span>
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={signOut}
                >
                  {busy ? "Signing out…" : "Logout"}
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login">Login</NavLink>
                <Link className="button small" to="/register">
                  Create account <span>↗</span>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      {error && (
        <div className="container">
          <Feedback>{error}</Feedback>
        </div>
      )}
      <main id="main">
        <Outlet />
      </main>
      <footer className="site-footer container">
        <Link to="/" className="brand">
          restivio.
        </Link>
        <span>A little room to unwind.</span>
        <span>Thoughtful stays. Simple bookings.</span>
      </footer>
    </>
  );
}
