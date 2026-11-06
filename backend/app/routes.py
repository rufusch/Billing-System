from __future__ import annotations

import os
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal, InvalidOperation
from zoneinfo import ZoneInfo

from flask import Blueprint, jsonify, request
from flask_jwt_extended import (
    create_access_token,
    get_jwt_identity,
    jwt_required,
    set_access_cookies,
    unset_jwt_cookies,
)
from sqlalchemy import func, or_, select
from werkzeug.security import check_password_hash

from .billing import BillingError, calculate_line, calculate_totals, money, quantity
from .extensions import db
from .models import AuditLog, InventoryMovement, Product, Sale, SaleItem, User
from .serializers import product_json, sale_json

api = Blueprint("api", __name__)


def error(message: str, status: int = 400, code: str = "invalid_request"):
    return jsonify(error={"code": code, "message": message}), status


def current_user() -> User | None:
    identity = get_jwt_identity()
    return db.session.get(User, int(identity)) if identity else None


def admin_required(user: User | None):
    return user is not None and user.active and user.role == "admin"


def parse_decimal(payload: dict, field: str, *, default=None, minimum: Decimal | None = None) -> Decimal:
    raw = payload.get(field, default)
    try:
        value = Decimal(str(raw))
    except (InvalidOperation, TypeError):
        raise BillingError(f"{field.replace('_', ' ').title()} must be a number.") from None
    if minimum is not None and value < minimum:
        raise BillingError(f"{field.replace('_', ' ').title()} must be at least {minimum}.")
    return value


@api.get("/health")
def health():
    try:
        db.session.execute(select(1))
        return jsonify(status="ok", database="connected")
    except Exception:
        return jsonify(status="degraded", database="unavailable"), 503


@api.post("/auth/login")
def login():
    payload = request.get_json(silent=True) or {}
    email = str(payload.get("email", "")).strip().lower()
    password = str(payload.get("password", ""))
    user = db.session.scalar(select(User).where(func.lower(User.email) == email))
    if not user or not user.active or not check_password_hash(user.password_hash, password):
        return error("Incorrect email or password.", 401, "invalid_credentials")
    response = jsonify(user={"id": user.id, "name": user.name, "email": user.email, "role": user.role})
    set_access_cookies(response, create_access_token(identity=str(user.id)))
    return response


@api.post("/auth/logout")
def logout():
    response = jsonify(message="Signed out.")
    unset_jwt_cookies(response)
    return response


@api.get("/auth/me")
@jwt_required()
def me():
    user = current_user()
    if not user or not user.active:
        return error("Account is unavailable.", 401, "unauthorized")
    return jsonify(user={"id": user.id, "name": user.name, "email": user.email, "role": user.role})


@api.get("/products")
@jwt_required()
def products_list():
    query = select(Product)
    if request.args.get("include_archived") != "true":
        query = query.where(Product.active.is_(True))
    search = request.args.get("q", "").strip()
    if search:
        term = f"%{search}%"
        query = query.where(or_(Product.name.ilike(term), Product.sku.ilike(term), Product.barcode.ilike(term)))
    category = request.args.get("category", "").strip()
    if category:
        query = query.where(Product.category == category)
    if request.args.get("low_stock") == "true":
        query = query.where(Product.stock <= Product.min_stock)
    items = db.session.scalars(query.order_by(Product.name)).all()
    return jsonify(products=[product_json(item) for item in items])


@api.post("/products")
@jwt_required()
def products_create():
    user = current_user()
    if not admin_required(user):
        return error("Administrator access is required.", 403, "forbidden")
    payload = request.get_json(silent=True) or {}
    try:
        product = Product(
            sku=str(payload.get("sku", "")).strip().upper(),
            barcode=str(payload.get("barcode", "")).strip() or None,
            name=str(payload.get("name", "")).strip(),
            category=str(payload.get("category", "General")).strip() or "General",
            unit=str(payload.get("unit", "pcs")).strip().lower(),
            price=money(parse_decimal(payload, "price", minimum=Decimal("0"))),
            gst_percent=money(parse_decimal(payload, "gst_percent", default=0, minimum=Decimal("0"))),
            stock=parse_decimal(payload, "stock", default=0, minimum=Decimal("0")),
            min_stock=parse_decimal(payload, "min_stock", default=5, minimum=Decimal("0")),
            reorder_qty=parse_decimal(payload, "reorder_qty", default=10, minimum=Decimal("0")),
        )
        if not product.sku or not product.name or product.unit not in {"pcs", "kg", "g", "l", "ml", "pack"}:
            raise BillingError("SKU, name, and a valid unit are required.")
        if product.gst_percent > 100:
            raise BillingError("GST percentage cannot exceed 100.")
        db.session.add(product)
        db.session.flush()
        if product.stock:
            db.session.add(
                InventoryMovement(
                    product_id=product.id,
                    movement_type="opening",
                    quantity=product.stock,
                    balance_after=product.stock,
                    created_by_id=user.id,
                )
            )
        db.session.commit()
        return jsonify(product=product_json(product)), 201
    except BillingError as exc:
        db.session.rollback()
        return error(str(exc))
    except Exception:
        db.session.rollback()
        return error("SKU or barcode already exists.", 409, "conflict")


@api.patch("/products/<int:product_id>")
@jwt_required()
def products_update(product_id: int):
    user = current_user()
    if not admin_required(user):
        return error("Administrator access is required.", 403, "forbidden")
    product = db.session.get(Product, product_id)
    if not product:
        return error("Product not found.", 404, "not_found")
    payload = request.get_json(silent=True) or {}
    try:
        for field in ("name", "category", "unit", "barcode"):
            if field in payload:
                value = str(payload[field]).strip()
                setattr(product, field, value or (None if field == "barcode" else getattr(product, field)))
        if "price" in payload:
            product.price = money(parse_decimal(payload, "price", minimum=Decimal("0")))
        if "gst_percent" in payload:
            product.gst_percent = money(parse_decimal(payload, "gst_percent", minimum=Decimal("0")))
        if "min_stock" in payload:
            product.min_stock = parse_decimal(payload, "min_stock", minimum=Decimal("0"))
        if "reorder_qty" in payload:
            product.reorder_qty = parse_decimal(payload, "reorder_qty", minimum=Decimal("0"))
        if "active" in payload:
            product.active = bool(payload["active"])
        db.session.add(
            AuditLog(
                user_id=user.id,
                action="product.updated",
                details=f"product_id={product.id}",
                ip_address=request.remote_addr,
            )
        )
        db.session.commit()
        return jsonify(product=product_json(product))
    except BillingError as exc:
        db.session.rollback()
        return error(str(exc))


@api.post("/products/<int:product_id>/stock")
@jwt_required()
def stock_adjust(product_id: int):
    user = current_user()
    if not admin_required(user):
        return error("Administrator access is required.", 403, "forbidden")
    payload = request.get_json(silent=True) or {}
    try:
        adjustment = quantity(payload.get("quantity"))
    except (BillingError, TypeError):
        return error("Quantity must be greater than zero.")
    product = db.session.scalar(select(Product).where(Product.id == product_id).with_for_update())
    if not product:
        return error("Product not found.", 404, "not_found")
    product.stock += adjustment
    db.session.add(
        InventoryMovement(
            product_id=product.id,
            movement_type="stock_in",
            quantity=adjustment,
            balance_after=product.stock,
            reference=str(payload.get("reference", "")).strip() or None,
            note=str(payload.get("note", "")).strip() or None,
            created_by_id=user.id,
        )
    )
    db.session.commit()
    return jsonify(product=product_json(product))


@api.post("/sales")
@jwt_required()
def sales_create():
    user = current_user()
    if not user or not user.active or user.role not in {"admin", "cashier"}:
        return error("Billing access is required.", 403, "forbidden")
    payload = request.get_json(silent=True) or {}
    raw_items = payload.get("items") or []
    if not isinstance(raw_items, list) or not raw_items:
        return error("Add at least one product to the bill.")
    payment_method = str(payload.get("payment_method", "")).lower()
    if payment_method not in {"cash", "upi", "card"}:
        return error("Choose cash, UPI, or card payment.")
    try:
        requested = {}
        for item in raw_items:
            product_id = int(item.get("product_id"))
            requested[product_id] = requested.get(product_id, Decimal("0")) + quantity(item.get("quantity"))
        products = db.session.scalars(
            select(Product).where(Product.id.in_(requested)).order_by(Product.id).with_for_update()
        ).all()
        if len(products) != len(requested):
            raise BillingError("One or more products are unavailable.")
        calculated_lines = []
        for product in products:
            qty = requested[product.id]
            if not product.active:
                raise BillingError(f"{product.name} is archived.")
            if product.stock < qty:
                raise BillingError(f"Only {product.stock:g} {product.unit} of {product.name} is available.")
            calculated_lines.append((product, qty, calculate_line(product.price, qty, product.gst_percent)))
        totals = calculate_totals([line for _, _, line in calculated_lines], payload.get("discount", 0))
        tendered = None
        change_due = None
        if payment_method == "cash":
            tendered = money(payload.get("amount_tendered", 0))
            if tendered < totals["total"]:
                raise BillingError("Amount tendered is less than the total.")
            change_due = money(tendered - totals["total"])
        sale = Sale(
            customer_name=str(payload.get("customer_name", "")).strip() or None,
            customer_phone=str(payload.get("customer_phone", "")).strip() or None,
            payment_method=payment_method,
            payment_reference=str(payload.get("payment_reference", "")).strip() or None,
            amount_tendered=tendered,
            change_due=change_due,
            created_by_id=user.id,
            **totals,
        )
        db.session.add(sale)
        db.session.flush()
        sale.bill_number = f"GB-{sale.created_at:%Y%m%d}-{sale.id:06d}"
        for product, qty, line in calculated_lines:
            product.stock -= qty
            sale.items.append(
                SaleItem(
                    product_id=product.id,
                    sku=product.sku,
                    name=product.name,
                    unit=product.unit,
                    quantity=qty,
                    unit_price=product.price,
                    gst_percent=product.gst_percent,
                    **line,
                )
            )
            db.session.add(
                InventoryMovement(
                    product_id=product.id,
                    movement_type="sale",
                    quantity=-qty,
                    balance_after=product.stock,
                    reference=sale.bill_number,
                    created_by_id=user.id,
                )
            )
        db.session.add(
            AuditLog(user_id=user.id, action="sale.completed", details=sale.bill_number, ip_address=request.remote_addr)
        )
        db.session.commit()
        return jsonify(sale=sale_json(sale, include_items=True)), 201
    except (BillingError, ValueError, TypeError) as exc:
        db.session.rollback()
        return error(str(exc))


@api.get("/sales")
@jwt_required()
def sales_list():
    query = select(Sale).order_by(Sale.created_at.desc())
    search = request.args.get("q", "").strip()
    if search:
        term = f"%{search}%"
        query = query.where(
            or_(Sale.bill_number.ilike(term), Sale.customer_name.ilike(term), Sale.customer_phone.ilike(term))
        )
    limit = min(max(request.args.get("limit", 50, type=int), 1), 200)
    sales = db.session.scalars(query.limit(limit)).all()
    return jsonify(sales=[sale_json(sale) for sale in sales])


@api.get("/sales/<int:sale_id>")
@jwt_required()
def sales_detail(sale_id: int):
    sale = db.session.get(Sale, sale_id)
    if not sale:
        return error("Bill not found.", 404, "not_found")
    return jsonify(sale=sale_json(sale, include_items=True))


@api.get("/reports/daily")
@jwt_required()
def daily_report():
    try:
        report_date = date.fromisoformat(request.args.get("date", date.today().isoformat()))
    except ValueError:
        return error("Date must use YYYY-MM-DD format.")
    try:
        store_timezone = ZoneInfo(os.getenv("STORE_TIMEZONE", "Asia/Kolkata"))
    except Exception:
        store_timezone = timezone.utc
    start = datetime.combine(report_date, time.min, tzinfo=store_timezone).astimezone(timezone.utc)
    end = (datetime.combine(report_date, time.min, tzinfo=store_timezone) + timedelta(days=1)).astimezone(timezone.utc)
    sales = db.session.scalars(select(Sale).where(Sale.created_at >= start, Sale.created_at < end)).all()
    payment_totals = {method: Decimal("0") for method in ("cash", "upi", "card")}
    for sale in sales:
        payment_totals[sale.payment_method] += sale.total
    return jsonify(
        report={
            "date": report_date.isoformat(),
            "bill_count": len(sales),
            "gross_sales": f"{sum((sale.subtotal for sale in sales), Decimal('0')):.2f}",
            "discounts": f"{sum((sale.discount for sale in sales), Decimal('0')):.2f}",
            "gst": f"{sum((sale.gst for sale in sales), Decimal('0')):.2f}",
            "net_sales": f"{sum((sale.total for sale in sales), Decimal('0')):.2f}",
            "payments": {key: f"{value:.2f}" for key, value in payment_totals.items()},
        }
    )
