"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { signup } from "../actions";

export function SignupForm() {
  const [state, action, pending] = useActionState(signup, undefined);
  const tzInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (tzInput.current) tzInput.current.value = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
  }, []);

  const cls = (f: string) => (state?.field === f ? "field invalid" : "field");

  return (
    <form action={action} className="card" style={{ display: "grid", gap: "var(--space-4)" }}>
      <h1 className="card-title">Create your account</h1>
      <input type="hidden" name="timezone" ref={tzInput} defaultValue="Asia/Kolkata" />
      <div className={cls("name")}>
        <label htmlFor="name">What should we call you?</label>
        <input id="name" name="name" className="input" maxLength={20} autoComplete="nickname" required autoFocus />
        {state?.field === "name" && <span className="help">{state.error}</span>}
      </div>
      <div className={cls("email")}>
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" className="input" autoComplete="username" required />
        {state?.field === "email" && <span className="help">{state.error}</span>}
      </div>
      <div className={cls("password")}>
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" className="input" minLength={8} autoComplete="new-password" required />
        <span className="help">{state?.field === "password" ? state.error : "At least 8 characters."}</span>
      </div>
      {state?.error && !state.field && (
        <p className="sm" role="alert" style={{ color: "var(--danger)" }}>
          {state.error}
        </p>
      )}
      <button className="btn btn-primary" disabled={pending}>
        {pending ? "Creating account…" : "Sign up"}
      </button>
      <p className="sm muted">
        Already have an account? <Link href="/login" style={{ color: "var(--primary)", fontWeight: 600 }}>Log in</Link>
      </p>
    </form>
  );
}
