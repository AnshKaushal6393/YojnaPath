import { apiPost } from "./api";

export function reportSchemeIssue(schemeId, payload) {
  return apiPost(`/api/schemes/${encodeURIComponent(schemeId)}/report`, payload);
}
