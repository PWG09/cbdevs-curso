import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"; import { storage } from "@/lib/firebase/client";
export async function uploadCourseFile(file:File,path:string){const r=ref(storage,path);await uploadBytes(r,file,{contentType:file.type||undefined});return {path:r.fullPath,url:await getDownloadURL(r)};}
export async function removeCourseFile(path:string){await deleteObject(ref(storage,path));}
