"""Train a small demand forecast model for the SliceMatic Stage 3 demo.

Usage:
    python scripts/forecast_model.py
    python scripts/forecast_model.py path/to/orders.csv
    python scripts/forecast_model.py --stdin-json [--write-cache path]

Expected CSV columns when a file is provided:
    created_at,final_total

JSON stdin format (--stdin-json):
    [{"createdAt": "...", "finalTotal": 699.0}, ...]
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import sys
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error
from sklearn.model_selection import train_test_split

IST = ZoneInfo("Asia/Kolkata")
FEATURE_NAMES = ["weekday", "hour", "is_weekend", "hourly_revenue"]
MODEL_NAME = "RandomForestRegressor"
MIN_BUCKETS_FOR_RMSE = 20


@dataclass(frozen=True)
class HourBucket:
    timestamp: datetime
    orders: int
    revenue: float


def parse_order_datetime(raw: str) -> datetime:
    dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=IST)
    else:
        dt = dt.astimezone(IST)
    return dt.replace(tzinfo=None)


def format_label(timestamp: datetime) -> str:
    return timestamp.strftime("%a %H:00")


def demo_orders() -> list[tuple[datetime, float]]:
    now = datetime.now(tz=IST).replace(minute=0, second=0, microsecond=0, tzinfo=None) - timedelta(days=42)
    orders: list[tuple[datetime, float]] = []
    for day in range(42):
        for hour in range(11, 23):
            weekend = 1 if (now + timedelta(days=day)).weekday() >= 5 else 0
            dinner_peak = 12 if hour in (19, 20, 21) else 0
            lunch_peak = 5 if hour in (12, 13) else 0
            baseline = 2 + weekend * 4 + dinner_peak + lunch_peak
            demand = max(0, round(baseline + math.sin(day / 3) * 2))
            for index in range(demand):
                orders.append((now + timedelta(days=day, hours=hour), 699 + index * 18))
    return orders


def read_orders_csv(path: Path | None) -> list[tuple[datetime, float]]:
    if path is None or not path.exists():
        return demo_orders()

    rows: list[tuple[datetime, float]] = []
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            raw_date = row.get("created_at") or row.get("order_datetime") or ""
            raw_total = row.get("final_total") or row.get("final_amount") or "0"
            if not raw_date:
                continue
            rows.append((parse_order_datetime(raw_date), float(raw_total)))
    return rows or demo_orders()


def read_orders_json(payload: list[dict]) -> list[tuple[datetime, float]]:
    rows: list[tuple[datetime, float]] = []
    for row in payload:
        raw_date = row.get("createdAt") or row.get("created_at") or row.get("order_datetime") or ""
        raw_total = row.get("finalTotal") or row.get("final_total") or row.get("final_amount") or 0
        if not raw_date:
            continue
        rows.append((parse_order_datetime(str(raw_date)), float(raw_total)))
    return rows


def bucket_by_hour(orders: list[tuple[datetime, float]]) -> list[HourBucket]:
    grouped: dict[datetime, dict[str, float]] = defaultdict(lambda: {"orders": 0, "revenue": 0.0})
    for created_at, total in orders:
        hour = created_at.replace(minute=0, second=0, microsecond=0)
        grouped[hour]["orders"] += 1
        grouped[hour]["revenue"] += total
    return [
        HourBucket(timestamp=hour, orders=int(values["orders"]), revenue=values["revenue"])
        for hour, values in sorted(grouped.items())
    ]


def build_features(bucket: HourBucket) -> list[float]:
    return [
        float(bucket.timestamp.weekday()),
        float(bucket.timestamp.hour),
        1.0 if bucket.timestamp.weekday() >= 5 else 0.0,
        bucket.revenue,
    ]


def confidence_for_rank(rank: int, rmse: float | None, bucket_count: int) -> float:
    base = 0.78 if rmse is not None else 0.65
    if bucket_count < MIN_BUCKETS_FOR_RMSE:
        base -= 0.1
    return round(min(0.95, base + max(0, 4 - rank) * 0.03), 2)


def train_model(buckets: list[HourBucket]) -> tuple[RandomForestRegressor, float | None]:
    x = [build_features(bucket) for bucket in buckets]
    y = [bucket.orders for bucket in buckets]
    model = RandomForestRegressor(n_estimators=160, random_state=42, min_samples_leaf=2)

    if len(buckets) < MIN_BUCKETS_FOR_RMSE:
        model.fit(x, y)
        return model, None

    x_train, x_test, y_train, y_test = train_test_split(x, y, test_size=0.22, random_state=42)
    model.fit(x_train, y_train)
    predictions = model.predict(x_test)
    rmse = float(math.sqrt(mean_squared_error(y_test, predictions)))
    return model, rmse


def predict_next_7_days(
    model: RandomForestRegressor,
    buckets: list[HourBucket],
    rmse: float | None,
) -> tuple[list[dict], list[dict]]:
    latest = max(bucket.timestamp for bucket in buckets)
    recent = buckets[-24:] if len(buckets) >= 24 else buckets
    avg_revenue = sum(bucket.revenue for bucket in recent) / max(len(recent), 1)

    future: list[HourBucket] = [
        HourBucket(timestamp=latest + timedelta(hours=offset), orders=0, revenue=avg_revenue)
        for offset in range(1, 24 * 7 + 1)
    ]
    predictions = model.predict([build_features(bucket) for bucket in future])

    ranked = sorted(
        zip(future, predictions),
        key=lambda item: item[1],
        reverse=True,
    )

    forecast: list[dict] = []
    for rank, (bucket, predicted) in enumerate(ranked[:7]):
        forecast.append(
            {
                "label": format_label(bucket.timestamp),
                "predictedOrders": max(1, round(float(predicted))),
                "confidence": confidence_for_rank(rank, rmse, len(buckets)),
            }
        )

    top_peaks = sorted(forecast, key=lambda item: item["predictedOrders"], reverse=True)[:3]
    return forecast, top_peaks


def build_forecast_result(orders: list[tuple[datetime, float]]) -> dict:
    buckets = bucket_by_hour(orders)
    if not buckets:
        raise ValueError("No hourly buckets available for training.")

    model, rmse = train_model(buckets)
    forecast, top_peaks = predict_next_7_days(model, buckets, rmse)

    return {
        "trainedAt": datetime.now(tz=IST).isoformat(),
        "orderCount": len(orders),
        "bucketCount": len(buckets),
        "model": MODEL_NAME,
        "features": FEATURE_NAMES,
        "rmse": round(rmse, 2) if rmse is not None else None,
        "forecast": forecast,
        "topPeaks": top_peaks,
    }


def print_cli_summary(result: dict) -> None:
    print(f"Training buckets: {result['bucketCount']}")
    if result["rmse"] is not None:
        print(f"Validation RMSE: {result['rmse']:.2f} orders/hour")
    else:
        print("Validation RMSE: insufficient data (< 20 hourly buckets)")
    print("Top prep windows:")
    for item in result["forecast"]:
        print(f"- {item['label']}: {item['predictedOrders']} predicted orders")


def main() -> None:
    parser = argparse.ArgumentParser(description="SliceMatic demand forecast trainer")
    parser.add_argument("csv_path", nargs="?", help="Optional CSV export path")
    parser.add_argument("--stdin-json", action="store_true", help="Read orders JSON from stdin")
    parser.add_argument("--write-cache", metavar="PATH", help="Write forecast cache JSON to PATH")
    args = parser.parse_args()

    if args.stdin_json:
        payload = json.load(sys.stdin)
        orders = read_orders_json(payload)
        if not orders:
            orders = demo_orders()
    else:
        csv_path = Path(args.csv_path) if args.csv_path else None
        orders = read_orders_csv(csv_path)

    result = build_forecast_result(orders)
    output = json.dumps(result, indent=2)

    if args.write_cache:
        cache_path = Path(args.write_cache)
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        cache_path.write_text(output + "\n", encoding="utf-8")

    if args.stdin_json:
        print(output)
    else:
        print_cli_summary(result)


if __name__ == "__main__":
    main()
