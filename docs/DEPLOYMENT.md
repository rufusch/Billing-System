# Deployment

## 1. Neon

1. Create a Neon PostgreSQL project.
2. Copy its pooled connection string.
3. Use the `postgresql+psycopg://` scheme and keep `sslmode=require`.
4. From `backend`, set `DATABASE_URL` and run `alembic upgrade head`.

## 2. Render

1. Create a Blueprint from the repository's `render.yaml`.
2. Set `DATABASE_URL` to the Neon connection string.
3. Set `FRONTEND_ORIGIN` to the final Vercel URL.
4. After the first deployment, run `python -m app.commands` and `python -m app.seed_catalog` in a Render shell.

## 3. Vercel

1. Import the repository and set the root directory to `frontend`.
2. Set `BACKEND_URL` to the Render service URL, without a trailing slash.
3. Deploy and then update Render's `FRONTEND_ORIGIN` if the production URL changed.

Never commit real `.env` files, Neon credentials, admin passwords, local databases, backups, or logs.

