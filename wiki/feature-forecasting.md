# Feature: Order Volume Forecasting

## Overview
The Order Volume Forecasting feature predicts pizza demand for the next 7 days based on historical order data. This helps the outlet manager anticipate rush hours, optimize kitchen staffing, and manage inventory effectively.

## Core Implementation Details

### 1. Machine Learning Model (`scripts/forecast_model.py`)
A Python script implements the core predictive logic, emphasizing a "Keep It Simple, Stupid" (KISS) approach without requiring heavy deep learning frameworks.

- **Model Choice:** `RandomForestRegressor` from `scikit-learn`. Chosen for its robustness to non-linear patterns (like daily peaks) and ease of training on small tabular datasets.
- **Features:** 
  - `weekday` (0=Monday, 6=Sunday)
  - `hour` (0-23, formatted to IST timezone)
- **Target Variable:** Total number of orders placed within that specific hour.
- **Data Processing:**
  - Extracts order timestamps from JSON (piped from the backend) or Supabase.
  - Groups timestamps into hourly buckets (`bucket_by_hour`).
- **Training & Validation:**
  - Requires a minimum of 20 hourly buckets to perform train/test splits.
  - Uses an 78/22 train/test split.
  - Evaluates using Root Mean Squared Error (RMSE) to measure prediction accuracy in "orders per hour".
- **Prediction:** Generates predicted order counts for store operating hours (11:00 to 22:00) over the next 7 days. Extracts the top 3 peak hours.

### 2. Backend Integration (`lib/forecast-service.ts`)
The Node.js backend interfaces with the Python script via a caching mechanism rather than running Python on the fly for every request.

- **Execution:** When `refreshForecastCache()` is called, it spawns a child process to run `python scripts/forecast_model.py`. It pipes the raw order JSON via standard input (`--stdin-json`).
- **Caching:** The Python script outputs a JSON artifact to `lib/generated/forecast-cache.json`.
- **Retrieval:** The `loadForecastCache()` function safely reads and parses this JSON file. It validates the shape of the data to ensure type safety before serving it to the frontend.
- **Data Served:** Returns the `forecast` array, `topPeaks`, and metadata (`rmse`, `trainedAt`, `model`).

### 3. Frontend Display
The forecast is consumed by the `AdminSummary` component in the admin dashboard. It highlights the `topPeaks` so managers instantly know when the kitchen will be slammed, and displays the RMSE to build trust in the model's current accuracy.

## Possible Interview Questions & Talking Points

- **Why use a RandomForest instead of an LLM or time-series specific model (like ARIMA)?**
  *Random Forest handles non-linear categorical/cyclical features (like hour of day and day of week) exceptionally well out of the box. It requires very little tuning compared to ARIMA and is vastly cheaper/faster to train locally than invoking an LLM for numerical regression.*
- **How do you handle cold starts (no historical data)?**
  *If the database lacks sufficient data, the Python script falls back to `demo_orders()`, a deterministic function that simulates 42 days of realistic order patterns (higher volume on weekends and dinner hours) to ensure the system and UI still function.*
- **How is the integration between Node.js and Python handled securely and performantly?**
  *We use an asynchronous, detached cache-refresh pattern. The Python script is not invoked on the hot path (during a user request). Instead, it runs in the background, writing to a static JSON cache file. The Node API merely reads this static JSON file, keeping API response times near zero.*
