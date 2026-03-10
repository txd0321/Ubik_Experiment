"""
Upload local model files to Tencent Cloud COS.

Prerequisites:
- Python dependencies are managed via uv with pyproject.toml.
  From the project root, run:

      uv run scripts/upload_models_to_cos.py

- Create a .env file in the project root with:
    TENCENT_COS_SECRET_ID=xxx
    TENCENT_COS_SECRET_KEY=xxx
    TENCENT_COS_REGION=ap-guangzhou
    TENCENT_COS_BUCKET=examplebucket-1250000000

This script uploads all .glb files from:
    frontend/public/assets/models
to COS under keys:
    models/<filename>
"""

import os
import sys
from pathlib import Path
from typing import Optional

import boto3
from botocore.config import Config
from dotenv import load_dotenv


def load_env() -> None:
  """
  Load environment variables from a project root .env file if present.

  Existing environment variables are not overwritten.
  """
  project_root = Path(__file__).resolve().parents[1]
  root_env = project_root / ".env"

  if root_env.exists():
    load_dotenv(root_env, override=False)


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


def upload_models(
  client,
  bucket: str,
  models_dir: Path,
  key_prefix: str = "models/",
) -> None:
  if not models_dir.exists() or not models_dir.is_dir():
    print(f"[ERROR] Models directory not found: {models_dir}", file=sys.stderr)
    raise SystemExit(1)

  glb_files = sorted(models_dir.glob("*.glb"))
  if not glb_files:
    print(f"[WARN] No .glb files found in {models_dir}")
    return

  print(f"[INFO] Found {len(glb_files)} model files in {models_dir}")
  print(f"[INFO] Uploading to bucket: {bucket}, prefix: {key_prefix!r}")

  for idx, path in enumerate(glb_files, start=1):
    key = f"{key_prefix}{path.name}"
    print(f"[{idx}/{len(glb_files)}] Uploading {path.name} -> {bucket}/{key} ...", end=" ", flush=True)

    try:
      client.upload_file(
        Filename=str(path),
        Bucket=bucket,
        Key=key,
      )
      etag: Optional[str] = None
      # 尝试通过 head_object 获取 ETag（非必需）
      try:
        head = client.head_object(Bucket=bucket, Key=key)
        etag = head.get("ETag")
      except Exception:
        etag = None
    except Exception as e:
      print("FAILED")
      print(f"    Error: {e}", file=sys.stderr)
      continue

    print("OK")
    if etag:
      print(f"    ETag: {etag}")


def main() -> None:
  project_root = Path(__file__).resolve().parents[1]
  models_dir = project_root / "frontend" / "public" / "assets" / "models"

  client = create_cos_client()
  bucket = get_required_env("TENCENT_COS_BUCKET")

  upload_models(client, bucket=bucket, models_dir=models_dir)


if __name__ == "__main__":
  main()

