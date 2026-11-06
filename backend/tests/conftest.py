import pytest
from werkzeug.security import generate_password_hash

from app import create_app
from app.extensions import db
from app.models import Product, User


@pytest.fixture()
def app():
    app = create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite://",
            "JWT_SECRET_KEY": "test-secret-that-is-long-enough-for-tests",
            "JWT_COOKIE_CSRF_PROTECT": False,
        }
    )
    with app.app_context():
        db.create_all()
        db.session.add(
            User(
                name="Admin",
                email="admin@test.local",
                password_hash=generate_password_hash("Password123!"),
                role="admin",
            )
        )
        db.session.add(
            Product(
                sku="RICE-001",
                name="Basmati Rice",
                category="Grains",
                unit="kg",
                price="120.00",
                gst_percent="5",
                stock="10",
                min_stock="2",
                reorder_qty="10",
            )
        )
        db.session.commit()
    yield app


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def auth_client(client):
    response = client.post("/api/auth/login", json={"email": "admin@test.local", "password": "Password123!"})
    assert response.status_code == 200
    return client
