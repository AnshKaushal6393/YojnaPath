# Admin Scheme Review

The `/api/admin/schemes` area is now review-first and read-only by default. Scraped schemes can be inspected, exported, and triaged, but create/update/delete controls stay out of the browser workflow.

## Review Queue

- `GET /api/admin/schemes` lists schemes for search, filtering, and inspection.
- `GET /api/admin/schemes/:id` loads a single scheme snapshot.
- `GET /api/admin/schemes/flags` returns the current review queue and enrichment gaps.
- `GET /api/admin/schemes/export` downloads the active scheme export as CSV.

## Dead URL Triage

Use `POST /api/admin/schemes/:id/review` to mark a dead URL as:

- `fixed`
- `moved`
- `inactive`

When a dead URL is triaged with `fixed` or `moved`, send a replacement `applyUrl` so the scheme record is repaired, not just tagged. `inactive` can be used without a replacement URL.

Once triaged with one of those statuses, the dead link stops counting as an actionable review flag in the admin queue. The note is stored with the review record for later reference.
