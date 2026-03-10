"""
Compress large texture files under frontend/public/assets/textures.

Usage:
  uv run scripts/compress_textures.py

Behavior:
  - Keeps file names unchanged (in-place overwrite).
  - Downscales long side to max 2048 (configurable).
  - JPEG quality default 82, progressive enabled.
  - PNG uses optimize/compress_level, and optional palette quantization.
"""

from __future__ import annotations

from pathlib import Path
from typing import Iterable

from PIL import Image


MAX_SIDE = 2048
JPEG_QUALITY = 82
PNG_COMPRESS_LEVEL = 9


def iter_texture_files(textures_dir: Path) -> Iterable[Path]:
  patterns = ("*.png", "*.jpg", "*.jpeg", "*.webp")
  for pattern in patterns:
    for path in textures_dir.glob(pattern):
      if path.is_file():
        yield path


def downscale_if_needed(image: Image.Image, max_side: int) -> Image.Image:
  width, height = image.size
  long_side = max(width, height)
  if long_side <= max_side:
    return image
  ratio = max_side / float(long_side)
  new_size = (max(1, int(width * ratio)), max(1, int(height * ratio)))
  return image.resize(new_size, Image.Resampling.LANCZOS)


def compress_texture(path: Path) -> tuple[int, int]:
  before_size = path.stat().st_size
  suffix = path.suffix.lower()

  with Image.open(path) as img:
    img.load()
    img = downscale_if_needed(img, MAX_SIDE)

    if suffix in {".jpg", ".jpeg"}:
      if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")
      img.save(
        path,
        format="JPEG",
        quality=JPEG_QUALITY,
        optimize=True,
        progressive=True,
      )
    elif suffix == ".png":
      # For opaque PNG, quantize can save a lot with acceptable quality.
      if img.mode in ("RGB", "RGBA"):
        try:
          img = img.quantize(colors=256, method=Image.Quantize.FASTOCTREE).convert(img.mode)
        except Exception:
          # Keep original mode when quantization fails.
          pass
      img.save(
        path,
        format="PNG",
        optimize=True,
        compress_level=PNG_COMPRESS_LEVEL,
      )
    elif suffix == ".webp":
      img.save(
        path,
        format="WEBP",
        quality=80,
        method=6,
      )
    else:
      return before_size, before_size

  after_size = path.stat().st_size
  return before_size, after_size


def human_size(num_bytes: int) -> str:
  units = ["B", "KB", "MB", "GB"]
  size = float(num_bytes)
  unit = 0
  while size >= 1024 and unit < len(units) - 1:
    size /= 1024
    unit += 1
  return f"{size:.2f} {units[unit]}"


def main() -> None:
  project_root = Path(__file__).resolve().parents[1]
  textures_dir = project_root / "frontend" / "public" / "assets" / "textures"
  if not textures_dir.exists():
    raise SystemExit(f"[ERROR] Missing directory: {textures_dir}")

  total_before = 0
  total_after = 0
  changed = 0
  files = sorted(iter_texture_files(textures_dir))

  if not files:
    print("[WARN] No texture files found.")
    return

  print(f"[INFO] Compressing {len(files)} textures in {textures_dir}")
  for idx, path in enumerate(files, start=1):
    before, after = compress_texture(path)
    total_before += before
    total_after += after
    if after != before:
      changed += 1
    diff = before - after
    sign = "-" if diff < 0 else ""
    print(f"[{idx}/{len(files)}] {path.name}: {human_size(before)} -> {human_size(after)} ({sign}{human_size(abs(diff))})")

  saved = total_before - total_after
  pct = (saved / total_before * 100.0) if total_before else 0.0
  print(f"[DONE] changed={changed}/{len(files)}")
  print(f"[DONE] total: {human_size(total_before)} -> {human_size(total_after)}, saved {human_size(saved)} ({pct:.2f}%)")


if __name__ == "__main__":
  main()
