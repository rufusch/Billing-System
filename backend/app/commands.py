import os

from werkzeug.security import generate_password_hash

from . import create_app
from .extensions import db
from .models import StoreSetting, User


def seed_admin() -> None:
    app = create_app()
    with app.app_context():
        email = os.environ["SEED_ADMIN_EMAIL"].strip().lower()
        password = os.environ["SEED_ADMIN_PASSWORD"]
        name = os.getenv("SEED_ADMIN_NAME", "Store Administrator").strip()
        existing = User.query.filter_by(email=email).first()
        if existing:
            print(f"Administrator already exists: {email}")
            return
        db.session.add(
            User(name=name, email=email, password_hash=generate_password_hash(password), role="admin", active=True)
        )
        defaults = {
            "store_name": "GreenBasket Grocery",
            "store_address": "Your store address",
            "store_phone": "+91 00000 00000",
            "currency": "INR",
        }
        for key, value in defaults.items():
            db.session.merge(StoreSetting(key=key, value=value))
        db.session.commit()
        print(f"Created administrator: {email}")


if __name__ == "__main__":
    seed_admin()
