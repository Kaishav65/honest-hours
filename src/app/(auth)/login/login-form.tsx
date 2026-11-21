"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "../actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="card" style={{ display: "grid", gap: "var(--space-4)" }}>
      <h1 className="card-title">Welcome back</h1>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" className="input" autoComplete="email" required autoFocus />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" className="input" autoComplete="current-password" required />
      </div>
      {state?.error && (
        <p className="sm" role="alert" style={{ color: "var(--danger)" }}>
          {state.error}
        </p>
      )}
      <button className="btn btn-primary" disabled={pending}>
        {pending ? "Logging in…" : "Log in"}
      </button>
      <p className="sm muted">
        New here? <Link href="/signup" style={{ color: "var(--primary)", fontWeight: 600 }}>Create an account</Link>
      </p>
    </form>
  );
}
