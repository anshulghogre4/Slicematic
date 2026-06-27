"""Train a small demand forecast model for the SliceMatic Stage 3 demo.

Usage:
    python scripts/forecast_model.py
    python scripts/forecast_model.py path/to/orders.csv

Expected CSV columns when a file is provided:
    created_at,final_total

The script prints RMSE and the next 7 recommended prep windows. It is intentionally
small so it can be explained in the live Q&A without hiding the business logic.
"""

from __future__ import annotations

import csv
import math
import sys
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path

from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error
from sklearn.model_selection import train_test_split


@dataclass(frozen=True)
class HourBucket:
    timestamp: datetime
    orders: int
    revenue: float


def demo_orders() -> list[tuple[datetime, float]]:
    now = datetime.now().replace(minute=0, second=0, microsecond=0) - timedelta(days=42)
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


def read_orders(path: Path | None) -> list[tuple[datetime, float]]:
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
            rows.append((datetime.fromisoformat(raw_date.replace("Z", "+00:00")).replace(tzinfo=None), float(raw_total)))
    return rows or demo_orders()


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


def features(bucket: HourBucket) -> list[float]:
    return [
        bucket.timestamp.weekday(),
        bucket.timestamp.hour,
        1 if bucket.timestamp.weekday() >= 5 else 0,
        bucket.revenue,
    ]


def main() -> None:
    csv_path = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    buckets = bucket_by_hour(read_orders(csv_path))
    x = [features(bucket) for bucket in buckets]
    y = [bucket.orders for bucket in buckets]

    x_train, x_test, y_train, y_test = train_test_split(x, y, test_size=0.22, random_state=42)
    model = RandomForestRegressor(n_estimators=160, random_state=42, min_samples_leaf=2)
    model.fit(x_train, y_train)
    predictions = model.predict(x_test)
    rmse = mean_squared_error(y_test, predictions, squared=False)

    latest = max(bucket.timestamp for bucket in buckets)
    future = [
        HourBucket(timestamp=latest + timedelta(hours=offset), orders=0, revenue=sum(bucket.revenue for bucket in buckets[-24:]) / 24)
        for offset in range(1, 24 * 7 + 1)
    ]
    future_predictions = sorted(
        zip(future, model.predict([features(bucket) for bucket in future])),
        key=lambda item: item[1],
        reverse=True,
    )[:7]

    print(f"Training buckets: {len(buckets)}")
    print(f"Validation RMSE: {rmse:.2f} orders/hour")
    print("Top prep windows:")
    for bucket, predicted in future_predictions:
        print(f"- {bucket.timestamp:%a %H:00}: {predicted:.0f} predicted orders")


if __name__ == "__main__":
    main()
