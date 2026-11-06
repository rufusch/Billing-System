from decimal import Decimal

from app.billing import BillingError, calculate_line, calculate_totals


def test_inclusive_gst_calculation():
    line = calculate_line(Decimal("105.00"), Decimal("2"), Decimal("5"))
    assert line == {
        "taxable_amount": Decimal("200.00"),
        "gst_amount": Decimal("10.00"),
        "line_total": Decimal("210.00"),
    }


def test_discount_cannot_exceed_subtotal():
    line = calculate_line(Decimal("50"), Decimal("1"), Decimal("0"))
    try:
        calculate_totals([line], Decimal("51"))
    except BillingError as exc:
        assert "between zero" in str(exc)
    else:
        raise AssertionError("Expected BillingError")


def test_checkout_deducts_stock_and_returns_receipt(auth_client):
    response = auth_client.post(
        "/api/sales",
        json={
            "items": [{"product_id": 1, "quantity": "2.5"}],
            "payment_method": "cash",
            "amount_tendered": "500",
            "customer_name": "Walk-in Customer",
        },
    )
    assert response.status_code == 201
    sale = response.get_json()["sale"]
    assert sale["bill_number"].startswith("GB-")
    assert sale["total"] == "300.00"
    assert sale["change_due"] == "200.00"
    products = auth_client.get("/api/products").get_json()["products"]
    assert products[0]["stock"] == "7.500"


def test_checkout_rejects_insufficient_stock(auth_client):
    response = auth_client.post(
        "/api/sales",
        json={
            "items": [{"product_id": 1, "quantity": "11"}],
            "payment_method": "upi",
        },
    )
    assert response.status_code == 400
    assert "available" in response.get_json()["error"]["message"]
