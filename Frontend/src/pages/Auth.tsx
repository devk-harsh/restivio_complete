import { useRef, useState, type FormEvent } from "react";
import axios from "axios";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authApi } from "../api/auth.api";
import { errorMessage } from "../utils/errors";
import { Feedback, Loading } from "../components/UI";
export function AuthPage({ register = false }: { register?: boolean }) {
  const { user, loading, login } = useAuth();
  const [params] = useSearchParams();
  const next = params.get("next") || "/hotels";
  const target =
    next.startsWith("/") && !next.startsWith("//") ? next : "/hotels";
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const values = new FormData(e.currentTarget);
    const email = String(values.get("email")).trim();
    const password = String(values.get("password"));
    try {
      if (register && !created) {
        await authApi.register({
          name: String(values.get("name")).trim(),
          email,
          password,
        });
        setCreated(true);
      }
      await login(email, password);
      navigate(target, { replace: true });
    } catch (e) {
      setError(
        axios.isAxiosError(e) && e.response?.status === 401
          ? "The email or password is incorrect. Please try again."
          : errorMessage(e),
      );
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <Loading text="Restoring your session…" />;
  if (user) return <Navigate to={target} replace />;
  return (
    <div className="container auth-page">
      <aside className="auth-story">
        <div className="eyebrow">WELCOME TO RESTIVIO</div>
        <h1>
          Your next
          <br />
          chapter
          <br />
          <em>starts here.</em>
        </h1>
        <p>
          Somewhere to pause.
          <br />
          Somewhere to feel at home.
        </p>
        <span className="auth-decoration">r.</span>
      </aside>
      <section className="auth-form">
        <div className="eyebrow">
          {register ? "A NEW BEGINNING" : "GOOD TO SEE YOU AGAIN"}
        </div>
        <h2>{register ? "Make yourself at home." : "Welcome back."}</h2>
        <p className="muted">
          {register
            ? "Create an account to book and manage your stays."
            : "Sign in to pick up where you left off."}
        </p>
        <form ref={formRef} onSubmit={submit} className="form-stack">
          {register && (
            <label>
              Your name
              <input
                name="name"
                autoComplete="name"
                required
                maxLength={100}
                placeholder="Full name"
              />
            </label>
          )}
          <label>
            Email address
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              placeholder="you@example.com"
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete={register ? "new-password" : "current-password"}
              required
              minLength={10}
              maxLength={72}
              placeholder={
                register ? "At least 10 characters" : "Your password"
              }
            />
          </label>
          {error && (
            <Feedback>
              {created
                ? "Your account was created. Please sign in. " + error
                : error}
            </Feedback>
          )}
          <button className="button full" disabled={busy}>
            {busy ? "Please wait…" : register ? "Create account →" : "Login →"}
          </button>
        </form>
        <p className="auth-switch">
          {register ? "Already have an account?" : "New to Restivio?"}{" "}
          <Link
            to={
              (register ? "/login" : "/register") +
              "?next=" +
              encodeURIComponent(target)
            }
          >
            {register ? "Login" : "Create an account"}
          </Link>
        </p>
        {!register && import.meta.env.VITE_DEMO_MODE === "true" && (
          <aside className="demo-login" aria-label="Demo accounts">
            <strong>Just exploring?</strong>
            <p>
              Choose a local demo account to fill the form, then log in.
              Bookings are real within this demo; no payment is taken.
            </p>
            <div className="demo-roles">
              {[
                { label: "Guest", email: "user@restivio.local" },
                { label: "Hotel manager", email: "manager@restivio.local" },
                { label: "Administrator", email: "admin@restivio.local" },
              ].map((account) => (
                <button
                  className="button secondary"
                  key={account.email}
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    const form = formRef.current!;
                    (
                      form.elements.namedItem("email") as HTMLInputElement
                    ).value = account.email;
                    (
                      form.elements.namedItem("password") as HTMLInputElement
                    ).value = "RestivioDemo123!";
                    setError("");
                  }}
                >
                  {account.label}
                </button>
              ))}
            </div>
          </aside>
        )}
      </section>
    </div>
  );
}
