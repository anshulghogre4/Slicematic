from __future__ import annotations

import json
from pathlib import Path
import ssl
import time
import urllib.error
import urllib.parse
import urllib.request

from PIL import Image, ImageOps, UnidentifiedImageError


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "assets" / "menu"
MANIFEST = OUT_DIR / "pizza_source_manifest.json"
W, H = 1440, 1080
USER_AGENT = "SliceMatic-MVP/1.0 (local development)"
SOURCE_PRIORITY = ("rawpixel", "wordpress", "wikimedia")

PIZZA_QUERIES = {
    "P1": ["margherita pizza", "pizza margherita"],
    "P2": ["vegetable pizza", "vegetarian pizza"],
    "P3": ["paneer pizza", "paneer tikka pizza"],
    "P4": ["tandoori paneer pizza", "tandoori pizza"],
    "P5": ["spicy vegetarian pizza", "spicy pizza"],
    "P6": ["vegetarian pizza", "veggie supreme pizza"],
    "P7": ["bbq chicken pizza", "barbecue chicken pizza"],
    "P8": ["chicken tikka pizza", "chicken pizza", "tandoori chicken pizza"],
}

PREFERRED_TITLE_TERMS = {
    "P1": ["margherita"],
    "P2": ["vegetable", "vegetarian"],
    "P3": ["paneer"],
    "P4": ["tandoori", "paneer"],
    "P5": ["spicy", "pizza"],
    "P6": ["vegetarian", "veggie"],
    "P7": ["bbq chicken", "barbecue chicken"],
    "P8": ["chicken", "tikka", "tandoori"],
}

EXCLUDE_TITLE_TERMS = {
    "P8": ["taco bell", "crispy chicken pizza"],
}


def open_url(url: str, timeout: int = 30) -> bytes:
    context = ssl._create_unverified_context()
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=timeout, context=context) as response:
        return response.read()


def search_openverse(query: str, source: str | None = None) -> list[dict]:
    params = {
        "q": query,
        "license_type": "commercial,modification",
        "extension": "jpg",
        "size": "large",
        "page_size": "12",
    }
    if source:
        params["source"] = source
    url = "https://api.openverse.engineering/v1/images/?" + urllib.parse.urlencode(params)
    data = json.loads(open_url(url).decode("utf-8"))
    return list(data.get("results", []))


def score_result(code: str, result: dict, source_index: int) -> int:
    title = (result.get("title") or "").lower()
    source = (result.get("source") or "").lower()
    width = int(result.get("width") or 0)
    height = int(result.get("height") or 0)
    score = min(width * height // 900_000, 18)
    if source in {"rawpixel", "wordpress", "wikimedia"}:
        score += 5
    if result.get("license") in {"cc0", "by", "by-sa"}:
        score += 4
    if "pizza" in title:
        score += 6
    for term in PREFERRED_TITLE_TERMS.get(code, []):
        if term in title:
            score += 9
    for term in EXCLUDE_TITLE_TERMS.get(code, []):
        if term in title:
            score -= 20
    if width >= 3000 and height >= 2000:
        score += 5
    return score - source_index


def wikimedia_thumb_url(url: str) -> str:
    parsed = urllib.parse.urlparse(url)
    parts = parsed.path.split("/")
    if "/wikipedia/commons/" not in url or len(parts) < 5 or not parts[-1]:
        return url
    filename = parts[-1]
    commons_index = parts.index("commons")
    thumb_parts = parts[: commons_index + 1] + ["thumb"] + parts[commons_index + 1 : -1]
    thumb_path = "/".join(thumb_parts + [filename, f"1280px-{filename}"])
    return urllib.parse.urlunparse((parsed.scheme, parsed.netloc, thumb_path, "", "", ""))


def download_url(result: dict) -> str:
    url = result.get("url") or ""
    if result.get("source") == "wikimedia":
        return wikimedia_thumb_url(url)
    return url


def select_result(code: str) -> tuple[str, dict] | None:
    best: tuple[str, dict, int] | None = None
    for query in PIZZA_QUERIES[code]:
        for source_index, source in enumerate(SOURCE_PRIORITY):
            try:
                results = search_openverse(query, source)
            except (urllib.error.URLError, TimeoutError, ValueError):
                continue
            for result in results:
                if not result.get("url"):
                    continue
                score = score_result(code, result, source_index)
                if best is None or score > best[2]:
                    best = (query, result, score)
            time.sleep(0.35)
    if best is None:
        return None
    return best[0], best[1]


def save_photo(code: str, result: dict) -> None:
    raw = open_url(download_url(result), timeout=45)
    tmp_path = OUT_DIR / f"{code}.download"
    tmp_path.write_bytes(raw)
    try:
        with Image.open(tmp_path) as img:
            img = ImageOps.exif_transpose(img)
            img = img.convert("RGB")
            img = ImageOps.fit(img, (W, H), method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))
            img.save(OUT_DIR / f"{code}.jpg", quality=90, optimize=True)
    finally:
        tmp_path.unlink(missing_ok=True)


def manifest_entry(code: str, query: str, result: dict) -> dict:
    return {
        "code": code,
        "query": query,
        "title": result.get("title"),
        "creator": result.get("creator"),
        "source": result.get("source"),
        "license": result.get("license"),
        "license_url": result.get("license_url"),
        "landing_url": result.get("foreign_landing_url"),
        "image_url": result.get("url"),
        "download_url": download_url(result),
        "source_width": result.get("width"),
        "source_height": result.get("height"),
    }


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest: list[dict] = []
    for code in PIZZA_QUERIES:
        try:
            selected = select_result(code)
            if selected is None:
                manifest.append({"code": code, "status": "kept-existing", "reason": "no search result"})
                print(f"{code}: kept existing asset")
                continue
            query, result = selected
            save_photo(code, result)
            manifest.append(manifest_entry(code, query, result))
            print(f"{code}: {result.get('title')}")
            time.sleep(0.4)
        except (urllib.error.URLError, TimeoutError, UnidentifiedImageError, OSError, ValueError) as exc:
            manifest.append({"code": code, "status": "kept-existing", "reason": str(exc)})
            print(f"{code}: kept existing asset ({exc})")
    MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"wrote pizza source manifest to {MANIFEST}")


if __name__ == "__main__":
    main()
