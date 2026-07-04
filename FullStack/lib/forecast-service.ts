import { spawnSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { seedForecast } from "./seed-data";
import type { ForecastMeta, ForecastPoint } from "./types";

export type ForecastCache = ForecastMeta & {
  forecast: ForecastPoint[];
  topPeaks: ForecastPoint[];
};

type OrderInput = { createdAt: string; finalTotal: number };

const CACHE_RELATIVE_PATH = path.join("lib", "generated", "forecast-cache.json");
const STALE_MS = 24 * 60 * 60 * 1000;
const REFRESH_TIMEOUT_MS = 8000;

function cachePath() {
  return path.join(process.cwd(), CACHE_RELATIVE_PATH);
}

function defaultForecastMeta(): ForecastMeta {
  return {
    model: "RandomForestRegressor",
    features: ["weekday", "hour", "is_weekend", "hourly_revenue"],
    rmse: null,
    trainedAt: new Date(0).toISOString(),
    orderCount: 0,
    bucketCount: 0
  };
}

function defaultCache(): ForecastCache {
  const meta = defaultForecastMeta();
  const topPeaks = [...seedForecast].sort((a, b) => b.predictedOrders - a.predictedOrders).slice(0, 3);
  return {
    ...meta,
    forecast: seedForecast,
    topPeaks
  };
}

function isValidCache(value: unknown): value is ForecastCache {
  if (!value || typeof value !== "object") return false;
  const cache = value as ForecastCache;
  return (
    Array.isArray(cache.forecast) &&
    cache.forecast.every(
      (point) =>
        typeof point.label === "string" &&
        typeof point.predictedOrders === "number" &&
        typeof point.confidence === "number"
    ) &&
    typeof cache.model === "string" &&
    Array.isArray(cache.features)
  );
}

export function loadForecastCache(): ForecastCache {
  const filePath = cachePath();
  if (!existsSync(filePath)) return defaultCache();

  try {
    const parsed = JSON.parse(readFileSync(filePath, "utf8")) as unknown;
    if (!isValidCache(parsed)) return defaultCache();
    const topPeaks =
      parsed.topPeaks?.length > 0
        ? parsed.topPeaks
        : [...parsed.forecast].sort((a, b) => b.predictedOrders - a.predictedOrders).slice(0, 3);
    return { ...parsed, topPeaks };
  } catch {
    return defaultCache();
  }
}

function pythonCommand() {
  return process.platform === "win32" ? "python" : "python3";
}

export function refreshForecastCache(orders: OrderInput[]): ForecastCache | null {
  const scriptPath = path.join(process.cwd(), "scripts", "forecast_model.py");
  const outputPath = cachePath();

  if (!existsSync(scriptPath)) {
    console.warn("Forecast refresh skipped: scripts/forecast_model.py not found.");
    return null;
  }

  const payload = JSON.stringify(orders);
  const result = spawnSync(
    pythonCommand(),
    [scriptPath, "--stdin-json", "--write-cache", outputPath],
    {
      cwd: process.cwd(),
      input: payload,
      encoding: "utf8",
      timeout: REFRESH_TIMEOUT_MS,
      maxBuffer: 10 * 1024 * 1024
    }
  );

  if (result.error || result.status !== 0) {
    console.warn(
      "Forecast refresh failed:",
      result.error?.message ?? result.stderr?.trim() ?? `exit ${result.status}`
    );
    return null;
  }

  return loadForecastCache();
}

function isCacheStale(cache: ForecastCache, orderCount: number) {
  if (cache.orderCount !== orderCount) return true;
  const trainedAt = Date.parse(cache.trainedAt);
  if (Number.isNaN(trainedAt)) return true;
  return Date.now() - trainedAt > STALE_MS;
}

function toSummaryPayload(cache: ForecastCache) {
  const forecast = [...cache.forecast].sort((a, b) => b.predictedOrders - a.predictedOrders);
  const topPeaks =
    cache.topPeaks.length > 0
      ? cache.topPeaks
      : forecast.slice(0, 3);

  const forecastMeta: ForecastMeta = {
    model: cache.model,
    features: cache.features,
    rmse: cache.rmse,
    trainedAt: cache.trainedAt,
    orderCount: cache.orderCount,
    bucketCount: cache.bucketCount
  };

  return { forecast, topPeaks, forecastMeta };
}

export async function getForecastForSummary(orders: OrderInput[], orderCount: number) {
  let cache = loadForecastCache();

  if (orders.length > 0 && isCacheStale(cache, orderCount)) {
    const refreshed = refreshForecastCache(orders);
    if (refreshed) cache = refreshed;
  }

  const payload = toSummaryPayload(cache);
  return {
    forecast: payload.forecast,
    topPeaks: payload.topPeaks,
    forecastMeta: payload.forecastMeta
  };
}
