import { db, requireStaffOrganization } from "@/lib/data/session";
import { AppError, toAppError } from "@/lib/errors";
import { isStorageObjectPath, safeExternalUrl } from "@/lib/safe-url";

const BUCKET = "cbdevs-course-assets";
const SIGNED_URL_TTL = 60 * 60;

/** Must match the bucket configuration (see cbdevs-database storage migration). */
export const UPLOAD_LIMIT_BYTES = 10 * 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const RESOURCE_TYPES = [...IMAGE_TYPES, "application/pdf", "text/plain", "application/zip"];
export const RESOURCE_ACCEPT = ".jpg,.jpeg,.png,.webp,.pdf,.txt,.zip";

export function validateUpload(file: File, allowedTypes: string[]): void {
  if (!allowedTypes.includes(file.type)) {
    throw new AppError(allowedTypes === IMAGE_TYPES ? "La imagen debe ser JPG, PNG o WebP." : "Formato no permitido. Usa PDF, ZIP, TXT, JPG, PNG o WebP.");
  }
  if (file.size > UPLOAD_LIMIT_BYTES) throw new AppError("El archivo supera el límite de 10 MB.");
  if (file.size === 0) throw new AppError("El archivo está vacío.");
}

function safeFileName(name: string): string {
  const cleaned = name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
  return cleaned.slice(-120) || "archivo";
}

/**
 * Uploads a course asset into the private bucket under the staff organization prefix, as the
 * storage policies require. Returns the object path; render it via `signAssetPaths`.
 */
export async function uploadCourseAsset(file: File, courseId: string, allowedTypes: string[] = RESOURCE_TYPES): Promise<string> {
  validateUpload(file, allowedTypes);
  const organizationId = await requireStaffOrganization();
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Date.now().toString(36);
  const path = `${organizationId}/course-files/${courseId.replace(/[^a-f0-9-]/gi, "")}/${id}-${safeFileName(file.name)}`;
  const { error } = await db().storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw toAppError(error as { message?: string }, "No se pudo subir el archivo. Verifica tus permisos y el formato.");
  return path;
}

export async function removeCourseAsset(path: string): Promise<void> {
  if (!isStorageObjectPath(path)) return;
  const { error } = await db().storage.from(BUCKET).remove([path]);
  if (error) throw new AppError("No se pudo eliminar el archivo anterior.");
}

/** Creates short-lived signed URLs in one request. Paths the viewer may not read are omitted. */
export async function signAssetPaths(paths: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter(isStorageObjectPath))];
  const result = new Map<string, string>();
  if (!unique.length) return result;
  const { data, error } = await db().storage.from(BUCKET).createSignedUrls(unique, SIGNED_URL_TTL);
  if (error || !data) return result;
  for (const item of data) {
    if (item.path && item.signedUrl && !item.error) result.set(item.path, item.signedUrl);
  }
  return result;
}

/** Resolves a stored value (object path or https URL) to something renderable, or undefined. */
export async function resolveAssetUrl(value: string | undefined | null): Promise<string | undefined> {
  if (!value) return undefined;
  if (isStorageObjectPath(value)) return (await signAssetPaths([value])).get(value);
  return safeExternalUrl(value);
}
