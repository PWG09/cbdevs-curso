import { getSupabaseClient, getCurrentOrganization } from "@/lib/supabase/client";

const BUCKET = "cbdevs-course-assets";

export async function uploadCourseFile(file: File, path: string) {
  const supabase = getSupabaseClient();
  const organizationId = await getCurrentOrganization("courses");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-160);
  const objectPath = `${organizationId}/${path.replace(/^\/+/, "").replace(/\.\./g, "")}-${safeName}`;
  const { error } = await supabase.storage.from(BUCKET).upload(objectPath, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw new Error("No se pudo subir el archivo. Verifica los permisos de almacenamiento.");
  const { data, error: signedError } = await supabase.storage.from(BUCKET).createSignedUrl(objectPath, 3600);
  if (signedError || !data?.signedUrl) throw new Error("El archivo se subió, pero no se pudo generar un enlace seguro.");
  return { path: objectPath, url: objectPath };
}

export async function removeCourseFile(path: string) {
  const { error } = await getSupabaseClient().storage.from(BUCKET).remove([path]);
  if (error) throw new Error("No se pudo eliminar el archivo.");
}
