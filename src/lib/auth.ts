export const AUTH_COOKIE = "sax_auth";

export async function authToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`${password}::sax-planner::v1`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
