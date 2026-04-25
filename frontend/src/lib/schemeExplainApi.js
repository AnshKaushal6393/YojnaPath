import { apiPost } from "./api";

export function explainSchemeInHindi(schemeId) {
  return apiPost(`/api/schemes/${encodeURIComponent(schemeId)}/explain`, {});
}
