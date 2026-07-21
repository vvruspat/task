import type { ReactNode } from "react";
import { AuthForm } from "../../components/auth-form";

export default function RegisterPage(): ReactNode {
  return <AuthForm mode="register" />;
}
