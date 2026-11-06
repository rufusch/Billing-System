import csv
from pathlib import Path

from . import create_app
from .extensions import db
from .models import Product


def seed() -> None:
    app = create_app()
    source = Path(__file__).resolve().parent.parent / "data" / "products.csv"
    with app.app_context(), source.open(newline="", encoding="utf-8") as handle:
        added = 0
        for row in csv.DictReader(handle):
            if Product.query.filter_by(sku=row["sku"]).first():
                continue
            db.session.add(Product(**row))
            added += 1
        db.session.commit()
        print(f"Added {added} catalogue products.")


if __name__ == "__main__":
    seed()
