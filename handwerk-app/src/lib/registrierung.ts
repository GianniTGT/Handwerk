// Registrierung: Standard geschlossen. Öffnen nur bewusst mit REGISTRIERUNG=offen in .env.
// Neue Betriebe legt TIFF unter /admin/betriebe an (TIFF_ADMIN_EMAILS).
export const registrierungOffen = () => process.env.REGISTRIERUNG === "offen";

export const tiffAdminEmails = () =>
  (process.env.TIFF_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

export const istTiffAdmin = (email: string | null | undefined) =>
  !!email && tiffAdminEmails().includes(email.toLowerCase());
