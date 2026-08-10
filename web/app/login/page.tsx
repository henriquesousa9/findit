import { LoginForm } from "./login-form";

// Reasons a gate sent someone back here. Without these, being redirected out
// of an area looked exactly like a failed login.
const NOTICES: Record<string, string> = {
  "no-profile": "A tua conta não tem perfil associado. Contacta o suporte.",
  "owner-only": "Essa área é exclusiva para donos de salão.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const errorKey = typeof params.error === "string" ? params.error : undefined;

  return <LoginForm notice={errorKey ? (NOTICES[errorKey] ?? null) : null} />;
}
