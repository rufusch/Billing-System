from decimal import Decimal


def decimal_string(value: Decimal | None, places: int = 2) -> str | None:
    if value is None:
        return None
    return f"{value:.{places}f}"


def product_json(product) -> dict:
    return {
        "id": product.id,
        "sku": product.sku,
        "barcode": product.barcode,
        "name": product.name,
        "category": product.category,
        "unit": product.unit,
        "price": decimal_string(product.price),
        "gst_percent": decimal_string(product.gst_percent),
        "stock": decimal_string(product.stock, 3),
        "min_stock": decimal_string(product.min_stock, 3),
        "reorder_qty": decimal_string(product.reorder_qty, 3),
        "active": product.active,
        "low_stock": product.stock <= product.min_stock,
    }


def sale_json(sale, include_items: bool = False) -> dict:
    result = {
        "id": sale.id,
        "bill_number": sale.bill_number,
        "customer_name": sale.customer_name,
        "customer_phone": sale.customer_phone,
        "subtotal": decimal_string(sale.subtotal),
        "discount": decimal_string(sale.discount),
        "gst": decimal_string(sale.gst),
        "total": decimal_string(sale.total),
        "payment_method": sale.payment_method,
        "payment_reference": sale.payment_reference,
        "amount_tendered": decimal_string(sale.amount_tendered),
        "change_due": decimal_string(sale.change_due),
        "created_at": sale.created_at.isoformat(),
        "cashier": sale.created_by.name if sale.created_by else None,
    }
    if include_items:
        result["items"] = [
            {
                "id": item.id,
                "product_id": item.product_id,
                "sku": item.sku,
                "name": item.name,
                "unit": item.unit,
                "quantity": decimal_string(item.quantity, 3),
                "unit_price": decimal_string(item.unit_price),
                "gst_percent": decimal_string(item.gst_percent),
                "gst_amount": decimal_string(item.gst_amount),
                "line_total": decimal_string(item.line_total),
            }
            for item in sale.items
        ]
    return result
