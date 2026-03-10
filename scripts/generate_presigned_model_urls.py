"""
Generate presigned download URLs for model files stored in Tencent Cloud COS.

This script scans:
    frontend/public/assets/models
and, for each *.glb file, generates a presigned GET URL for the corresponding
COS object key:
    models/<filename>

It then writes a JSON map:
    { "models/<filename>": "<presigned-url>", ... }
to:
    frontend/public/model-urls.json

Usage (from project root, with uv):
    uv run scripts/generate_presigned_model_urls.py

Required environment variables in .env (project root):
    TENCENT_COS_SECRET_ID
    TENCENT_COS_SECRET_KEY
    TENCENT_COS_REGION
    TENCENT_COS_BUCKET

Optional:
    TENCENT_COS_PRESIGN_EXPIRES_SECONDS  # default: 2592000 (30 days)
"""

import json
import os
import sys
from pathlib import Path
from typing import Dict

import boto3
from botocore.config import Config
from dotenv import load_dotenv


def load_env() -> None:
  project_root = Path(__file__).resolve().parents[1]
  env_path = project_root / ".env"
  if env_path.exists():
    load_dotenv(env_path, override=False)


def get_required_env(name: str) -> str:
  value = os.getenv(name)
  if not value:
    print(f"[ERROR] Missing required environment variable: {name}", file=sys.stderr)
    raise SystemExit(1)
  return value


def create_cos_client():
  load_env()

  secret_id = get_required_env("TENCENT_COS_SECRET_ID")
  secret_key = get_required_env("TENCENT_COS_SECRET_KEY")
  region = get_required_env("TENCENT_COS_REGION")
  endpoint = os.getenv("TENCENT_COS_ENDPOINT", f"https://cos.{region}.myqcloud.com")

  session = boto3.session.Session()
  client = session.client(
    "s3",
    region_name=region,
    endpoint_url=endpoint,
    aws_access_key_id=secret_id,
    aws_secret_access_key=secret_key,
    config=Config(signature_version="s3v4"),
  )
  return client


def generate_presigned_urls(
  client,
  bucket: str,
  models_dir: Path,
  key_prefix: str = "models/",
  expires_seconds: int = 30 * 24 * 60 * 60,
) -> Dict[str, str]:
  if not models_dir.exists() or not models_dir.is_dir():
    print(f"[ERROR] Models directory not found: {models_dir}", file=sys.stderr)
    raise SystemExit(1)

  glb_files = sorted(models_dir.glob("*.glb"))
  if not glb_files:
    print(f"[WARN] No .glb files found in {models_dir}")
    return {}

  print(f"[INFO] Generating presigned URLs for {len(glb_files)} files.")
  url_map: Dict[str, str] = {}

  for idx, path in enumerate(glb_files, start=1):
    key = f"{key_prefix}{path.name}"
    print(f"[{idx}/{len(glb_files)}] Signing {key} ...", end=" ", flush=True)

    try:
      url = client.generate_presigned_url(
        ClientMethod="get_object",
        Params={"Bucket": bucket, "Key": key},
        ExpiresIn=expires_seconds,
      )
    except Exception as e:
      print("FAILED")
      print(f"    Error: {e}", file=sys.stderr)
      continue

    url_map[key] = url
    print("OK")

  return url_map


def main() -> None:
  project_root = Path(__file__).resolve().parents[1]
  models_dir = project_root / "frontend" / "public" / "assets" / "models"
  output_path = project_root / "frontend" / "public" / "model-urls.json"

  client = create_cos_client()
  bucket = get_required_env("TENCENT_COS_BUCKET")
  expires = int(os.getenv("TENCENT_COS_PRESIGN_EXPIRES_SECONDS", str(30 * 24 * 60 * 60)))

  url_map = generate_presigned_urls(
    client=client,
    bucket=bucket,
    models_dir=models_dir,
    key_prefix="models/",
    expires_seconds=expires,
  )

  output_path.parent.mkdir(parents=True, exist_ok=True)
  with output_path.open("w", encoding="utf-8") as f:
    json.dump(url_map, f, ensure_ascii=False, indent=2)

  print(f"[INFO] Wrote {len(url_map)} entries to {output_path}")


if __name__ == "__main__":
  main()

