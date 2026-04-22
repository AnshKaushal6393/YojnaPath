# Admin Analytics

The admin analytics surface is exposed under `/api/admin/analytics/*`.

## Routes

- `GET /api/admin/analytics/overview`
- `GET /api/admin/analytics/funnel`
- `GET /api/admin/analytics/nearmiss`
- `GET /api/admin/analytics/schemes`
- `GET /api/admin/analytics/photo`
- `GET /api/admin/analytics/kiosk`

## Notes

- `overview` returns 30 days of match counts plus user type, state, and language breakdowns.
- `nearmiss` and `schemes` are derived from the live matcher and primary profiles so they show real blocking reasons.
- `photo` uses the current `users.photo_type` distribution.
- `kiosk` uses kiosk usage and kiosk PDF download events, plus kiosk session match logs.

