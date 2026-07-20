import type { ReactNode } from "react";
import { AuthForm } from "../../components/auth-form";

export default function LoginPage(): ReactNode {
  return <AuthForm mode="login" />;
}
