import { apiPostForm } from "./api";
import { getAuthToken } from "./authStorage";

export async function uploadProfilePhoto(fileOrBlob, options = {}) {
  const token = getAuthToken();
  if (!token) {
    throw new Error("Please log in again.");
  }

  const formData = new FormData();
  formData.append("photo", fileOrBlob, options.filename || "profile.jpg");

  if (options.folder) {
    formData.append("folder", options.folder);
  }

  if (options.publicId) {
    formData.append("publicId", options.publicId);
  }

  const payload = await apiPostForm("/api/upload/photo", formData, { token });
  return payload.photoUrl || "";
}
