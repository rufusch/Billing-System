from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal

MONEY = Decimal("0.01")
QTY = Decimal("0.001")


class BillingError(ValueError):
    pass


def money(value: Decimal | str | int | float) -> Decimal:
    return Decimal(str(value)).quantize(MONEY, rounding=ROUND_HALF_UP)


def quantity(value: Decimal | str | int | float) -> Decimal:
    parsed = Decimal(str(value)).quantize(QTY, rounding=ROUND_HALF_UP)
    if parsed <= 0:
        raise BillingError("Quantity must be greater than zero.")
    return parsed


def calculate_line(unit_price: Decimal, qty: Decimal, gst_percent: Decimal) -> dict[str, Decimal]:
    line_total = money(unit_price * qty)
    if gst_percent > 0:
        taxable = money(line_total * Decimal("100") / (Decimal("100") + gst_percent))
        gst_amount = money(line_total - taxable)
    else:
        taxable = line_total
        gst_amount = Decimal("0.00")
    return {"taxable_amount": taxable, "gst_amount": gst_amount, "line_total": line_total}


def calculate_totals(lines: list[dict], discount: Decimal | str | int | float = 0) -> dict[str, Decimal]:
    subtotal = money(sum((line["line_total"] for line in lines), Decimal("0")))
    gst = money(sum((line["gst_amount"] for line in lines), Decimal("0")))
    discount_amount = money(discount)
    if discount_amount < 0 or discount_amount > subtotal:
        raise BillingError("Discount must be between zero and the subtotal.")
    return {
        "subtotal": subtotal,
        "discount": discount_amount,
        "gst": gst,
        "total": money(subtotal - discount_amount),
    }
