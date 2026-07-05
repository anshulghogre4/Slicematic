"""Train hourly order-volume forecast from Supabase order history (KISS).

Model: RandomForestRegressor
Features: weekday (0=Mon), hour (0-23, IST)
Target: orders per hour
Metric: hold-out RMSE (orders/hour)

Usage:
    python scripts/forecast_model.py
    python scripts/forecast_model.py --stdin-json [--write-cache path]
"""

from __future__ import annotations

import argparse
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
FEATURE_NAMES = ["weekday", "hour"]
MODEL_NAME = "RandomForestRegressor"
MIN_BUCKETS_FOR_RMSE = 20
STORE_HOURS = range(11, 23)


@dataclass(frozen=True)
class HourBucket:
    timestamp: datetime
    orders: int


def parse_order_datetime(raw: str) -> datetime:
    dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=IST)
    else:
        dt = dt.astimezone(IST)
    return dt.replace(tzinfo=None)


def format_label(timestamp: datetime) -> str:
    return timestamp.strftime("%a %H:00")


def demo_orders() -> list[datetime]:
    start = datetime.now(tz=IST).replace(minute=0, second=0, microsecond=0, tzinfo=None) - timedelta(days=42)
    rows: list[datetime] = []
    for day in range(42):
        for hour in STORE_HOURS:
            weekend = 1 if (start + timedelta(days=day)).weekday() >= 5 else 0
            dinner = 3 if hour in (19, 20, 21) else 0
            lunch = 2 if hour in (12, 13) else 0
            demand = max(1, 2 + weekend * 2 + dinner + lunch)
            for _ in range(demand):
                rows.append(start + timedelta(days=day, hours=hour))
    return rows


def read_orders_json(payload: list[dict]) -> list[datetime]:
    rows: list[datetime] = []
    for row in payload:
        raw_date = row.get("createdAt") or row.get("created_at") or row.get("order_datetime") or ""
        if raw_date:
            rows.append(parse_order_datetime(str(raw_date)))
    return rows


def bucket_by_hour(timestamps: list[datetime]) -> list[HourBucket]:
    grouped: dict[datetime, int] = defaultdict(int)
    for created_at in timestamps:
        hour = created_at.replace(minute=0, second=0, microsecond=0)
        grouped[hour] += 1
    return [HourBucket(timestamp=hour, orders=count) for hour, count in sorted(grouped.items())]


def build_features(timestamp: datetime) -> list[float]:
    return [float(timestamp.weekday()), float(timestamp.hour)]


def train_model(buckets: list[HourBucket]) -> tuple[RandomForestRegressor, float | None]:
    x = [build_features(bucket.timestamp) for bucket in buckets]
    y = [bucket.orders for bucket in buckets]
    model = RandomForestRegressor(n_estimators=100, random_state=42)

    if len(buckets) < MIN_BUCKETS_FOR_RMSE:
        model.fit(x, y)
        return model, None

    x_train, x_test, y_train, y_test = train_test_split(x, y, test_size=0.22, random_state=42)
    model.fit(x_train, y_train)
    rmse = float(math.sqrt(mean_squared_error(y_test, model.predict(x_test))))
    return model, rmse


def future_hour_slots(latest: datetime) -> list[datetime]:
    start = latest.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
    slots: list[datetime] = []
    cursor = start
    end = start + timedelta(days=7)
    while cursor < end:
        if cursor.hour in STORE_HOURS:
            slots.append(cursor)
        cursor += timedelta(hours=1)
    return slots


def predict_next_7_days(
    model: RandomForestRegressor,
    buckets: list[HourBucket],
) -> tuple[list[dict], list[dict]]:
    latest = max(bucket.timestamp for bucket in buckets)
    slots = future_hour_slots(latest)
    predictions = model.predict([build_features(slot) for slot in slots])

    forecast = [
        {
            "label": format_label(slot),
            "predictedOrders": max(0, round(float(pred))),
        }
        for slot, pred in zip(slots, predictions)
    ]
    top_peaks = sorted(forecast, key=lambda item: item["predictedOrders"], reverse=True)[:3]
    return forecast, top_peaks


def build_forecast_result(timestamps: list[datetime]) -> dict:
    buckets = bucket_by_hour(timestamps)
    if not buckets:
        raise ValueError("No hourly buckets available for training.")

    model, rmse = train_model(buckets)
    forecast, top_peaks = predict_next_7_days(model, buckets)

    return {
        "trainedAt": datetime.now(tz=IST).isoformat(),
        "orderCount": len(timestamps),
        "bucketCount": len(buckets),
        "model": MODEL_NAME,
        "features": FEATURE_NAMES,
        "rmse": round(rmse, 2) if rmse is not None else None,
        "forecast": forecast,
        "topPeaks": top_peaks,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="SliceMatic demand forecast trainer")
    parser.add_argument("--stdin-json", action="store_true", help="Read orders JSON from stdin")
    parser.add_argument("--write-cache", metavar="PATH", help="Write forecast cache JSON to PATH")
    args = parser.parse_args()

    if args.stdin_json:
        payload = json.load(sys.stdin)
        timestamps = read_orders_json(payload)
        if not timestamps:
            timestamps = demo_orders()
    else:
        timestamps = demo_orders()

    result = build_forecast_result(timestamps)
    output = json.dumps(result, indent=2)

    if args.write_cache:
        cache_path = Path(args.write_cache)
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        cache_path.write_text(output + "\n", encoding="utf-8")

    if args.stdin_json:
        print(output)
    else:
        print(f"Training buckets: {result['bucketCount']}")
        if result["rmse"] is not None:
            print(f"Validation RMSE: {result['rmse']:.2f} orders/hour")
        else:
            print("Validation RMSE: insufficient data (< 20 hourly buckets)")
        print("Top 3 peak hours (next 7 days):")
        for item in result["topPeaks"]:
            print(f"- {item['label']}: {item['predictedOrders']} predicted orders")


if __name__ == "__main__":
    main()
