// Supabase/PostgREST errors are plain objects with a `message` field, not
// Error instances — an `err instanceof Error` check silently discards them,
// which loses exactly the messages worth showing ("no account found with
// that email", "this person has already been invited", ...).
export function errorMessage(err: unknown, fallback = "Tenta novamente.") {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    const message = (err as { message: unknown }).message;
    if (typeof message === "string" && message.length > 0) return message;
  }
  return fallback;
}
