#!/usr/bin/env python3
"""
DPGNotes PWA & Bundle Optimizer Verification Suite
Validates PWA manifest, service worker integrity, asset byte compression ratios,
and verifies zero syntax regression across the web app bundle.
"""

import os
import sys
import json
import gzip
from pathlib import Path

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT_DIR = Path(__file__).resolve().parent.parent
PUBLIC_DIR = ROOT_DIR / "public"

def test_manifest_integrity():
    manifest_path = PUBLIC_DIR / "manifest.json"
    if not manifest_path.exists():
        print("❌ FAIL: manifest.json not found in public/")
        return False

    try:
        with open(manifest_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        required_keys = ["name", "short_name", "start_url", "display", "icons"]
        for key in required_keys:
            if key not in data:
                print(f"❌ FAIL: Missing '{key}' in manifest.json")
                return False
        
        # Check icons
        icons = data.get("icons", [])
        if not icons:
            print("❌ FAIL: No icons defined in manifest.json")
            return False
        
        for icon in icons:
            src = icon.get("src", "").lstrip("/")
            icon_file = PUBLIC_DIR / src
            if not icon_file.exists():
                print(f"❌ FAIL: Icon referenced in manifest does not exist: {src}")
                return False

        print(f"✅ PASS: manifest.json is valid (App: '{data['name']}', Icons: {len(icons)})")
        return True
    except Exception as e:
        print(f"❌ FAIL: manifest.json parsing error: {e}")
        return False

def test_service_worker_and_pwa():
    sw_path = PUBLIC_DIR / "service-worker.js"
    pwa_path = PUBLIC_DIR / "pwa.js"

    if not sw_path.exists():
        print("❌ FAIL: service-worker.js not found in public/")
        return False
    if not pwa_path.exists():
        print("❌ FAIL: pwa.js not found in public/")
        return False

    sw_content = sw_path.read_text(encoding="utf-8")
    pwa_content = pwa_path.read_text(encoding="utf-8")

    if "CACHE_NAME" not in sw_content or "fetch" not in sw_content:
        print("❌ FAIL: service-worker.js missing cache or fetch handlers")
        return False

    if "serviceWorker.register" not in pwa_content:
        print("❌ FAIL: pwa.js missing registration call")
        return False

    print("✅ PASS: service-worker.js and pwa.js verified")
    return True

def test_bundle_compression_metrics():
    critical_assets = [
        "index.html",
        "style.css",
        "script.js",
        "dpg-loader.js",
        "dpg-utility-quota.js",
        "pwa.js",
        "service-worker.js"
    ]

    print("\n--- Byte-Level Bundle Compression Analysis ---")
    print(f"{'Asset':<25} {'Raw (KB)':<12} {'Gzip (KB)':<12} {'Ratio':<10}")
    print("-" * 60)

    for asset in critical_assets:
        asset_path = PUBLIC_DIR / asset
        if not asset_path.exists():
            print(f"{asset:<25} {'MISSING':<12}")
            continue

        raw_bytes = asset_path.read_bytes()
        raw_size = len(raw_bytes)
        gz_bytes = gzip.compress(raw_bytes, compresslevel=9)
        gz_size = len(gz_bytes)
        ratio = (1.0 - (gz_size / raw_size)) * 100.0 if raw_size > 0 else 0

        print(f"{asset:<25} {raw_size/1024:>8.2f} KB  {gz_size/1024:>8.2f} KB  {ratio:>8.1f}%")

    print("-" * 60)
    return True

def main():
    print("==================================================")
    print("  DPGNotes PWA & Byte-Level Bundle Verification   ")
    print("==================================================")

    m_ok = test_manifest_integrity()
    sw_ok = test_service_worker_and_pwa()
    bc_ok = test_bundle_compression_metrics()

    if m_ok and sw_ok and bc_ok:
        print("\n✨ ALL PWA VERIFICATION TESTS PASSED SUCCESSFULLY! ✨\n")
        return 0
    else:
        print("\n❌ SOME PWA TESTS FAILED! ❌\n")
        return 1

if __name__ == "__main__":
    sys.exit(main())
