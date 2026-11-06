from __future__ import annotations

import os
from datetime import timedelta

from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from .extensions import db

jwt = JWTManager()


def create_app(test_config: dict | None = None) -> Flask:
    app = Flask(__name__)
    database_url = os.getenv("DATABASE_URL", "sqlite:///grocery_dev.db")
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql+psycopg://", 1)

    app.config.update(
        SQLALCHEMY_DATABASE_URI=database_url,
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        SQLALCHEMY_ENGINE_OPTIONS={"pool_pre_ping": True},
        JWT_SECRET_KEY=os.getenv("JWT_SECRET_KEY", "development-only-change-this-secret"),
        JWT_TOKEN_LOCATION=["cookies"],
        JWT_COOKIE_SECURE=os.getenv("COOKIE_SECURE", "false").lower() == "true",
        JWT_COOKIE_SAMESITE="Lax",
        JWT_COOKIE_CSRF_PROTECT=True,
        JWT_ACCESS_TOKEN_EXPIRES=timedelta(hours=8),
        JWT_ACCESS_COOKIE_PATH="/api",
        JWT_ACCESS_CSRF_COOKIE_PATH="/",
    )
    if test_config:
        app.config.update(test_config)

    db.init_app(app)
    jwt.init_app(app)
    CORS(
        app,
        origins=[os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")],
        supports_credentials=True,
        allow_headers=["Content-Type", "X-CSRF-TOKEN"],
    )

    from .routes import api

    app.register_blueprint(api, url_prefix="/api")

    @app.after_request
    def security_headers(response):
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        return response

    @app.errorhandler(404)
    def not_found(_error):
        return jsonify(error={"code": "not_found", "message": "Resource not found."}), 404

    @app.errorhandler(500)
    def server_error(_error):
        db.session.rollback()
        return jsonify(error={"code": "server_error", "message": "The request could not be completed."}), 500

    return app
