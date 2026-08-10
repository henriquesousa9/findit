import Link from "next/link";
import { requireRole } from "@/lib/auth/requireRole";
import { SignOutButton } from "./sign-out-button";

// Where client accounts land on the web. They have no dashboard here — the
// booking experience is the mobile app — but silently bouncing them to the
// login screen made a correct login look broken.
export default async function AppOnlyPage() {
  const { profile } = await requireRole(["client"]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md space-y-4 rounded-xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold">Olá{profile.full_name ? `, ${profile.full_name}` : ""}!</h1>
        <p className="text-neutral-600">
          A tua conta é de <strong>cliente</strong>. Para procurares salões e marcares serviços, usa a app FindIt no
          telemóvel — esta área web é para donos de salão e profissionais.
        </p>
        <p className="text-sm text-neutral-500">
          Se és dono de um salão e querias a dashboard de gestão,{" "}
          <Link href="/signup" className="text-neutral-900 underline">
            cria uma conta de gestor
          </Link>
          .
        </p>
        <SignOutButton />
      </div>
    </div>
  );
}
