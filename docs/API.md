# API summary

All protected endpoints use an HTTP-only JWT cookie. Mutating requests also require the CSRF value issued at login in the `X-CSRF-TOKEN` header.

- `GET /api/health`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/products`
- `POST /api/products` — administrator
- `PATCH /api/products/:id` — administrator
- `POST /api/products/:id/stock` — administrator
- `POST /api/sales`
- `GET /api/sales`
- `GET /api/sales/:id`
- `GET /api/reports/daily?date=YYYY-MM-DD`

Error responses use `{ "error": { "code": "...", "message": "..." } }`.

