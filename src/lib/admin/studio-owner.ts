export const STUDIO_OWNER_USERNAME = "stevenmarr";

export function studioOwnerLocked(username: string | null | undefined): string | null {
  if ((username ?? "").trim().toLowerCase() !== STUDIO_OWNER_USERNAME) return null;
  return "The studio owner account stays an admin. It cannot be demoted, disabled, or deleted here.";
}
