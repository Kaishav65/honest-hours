import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in · Honest Hours" };

export default function LoginPage() {
  return <LoginForm />;
}
