import { spawnSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { seedForecast } from "./seed-data";
import type { ForecastMeta, ForecastPoint } from "./types";

export type ForecastCache = ForecastMeta & {
  forecast: ForecastPoint[];
  topPeaks: ForecastPoint[];
};

type OrderInput = { createdAt: string };

const CACHE_RELATIVE_PATH = path.join("lib", "generated", "forecast-cache.json");

function cachePath() {
  return path.join(process.cwd(), CACHE_RELATIVE_PATH);
}

function defaultForecastMeta(): ForecastMeta {
  return {
    model: "RandomForestRegressor",
    features: ["weekday", "hour"],
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
      (point) => typeof point.label === "string" && typeof point.predictedOrders === "number"
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

function toSummaryPayload(cache: ForecastCache) {
  const topPeaks =
    cache.topPeaks.length > 0
      ? cache.topPeaks
      : [...cache.forecast].sort((a, b) => b.predictedOrders - a.predictedOrders).slice(0, 3);

  const forecastMeta: ForecastMeta = {
    model: cache.model,
    features: cache.features,
    rmse: cache.rmse,
    trainedAt: cache.trainedAt,
    orderCount: cache.orderCount,
    bucketCount: cache.bucketCount
  };

  return { forecast: cache.forecast, topPeaks, forecastMeta };
}

export async function getForecastForSummary() {
  return toSummaryPayload(loadForecastCache());
}

function pythonCommand() {
  return process.platform === "win32" ? "python" : "python3";
}

export function refreshForecastCache(orders: OrderInput[]): ForecastCache | null {
  const scriptPath = path.join(process.cwd(), "scripts", "forecast_model.py");
  const outputPath = cachePath();

  if (!existsSync(scriptPath)) return null;

  const result = spawnSync(
    pythonCommand(),
    [scriptPath, "--stdin-json", "--write-cache", outputPath],
    {
      cwd: process.cwd(),
      input: JSON.stringify(orders),
      encoding: "utf8",
      timeout: 30000,
      maxBuffer: 10 * 1024 * 1024
    }
  );

  if (result.error || result.status !== 0) return null;
  return loadForecastCache();
}
