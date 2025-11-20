# src/scan_dataset.py
from pathlib import Path
from collections import Counter
import argparse
import sys

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".webp"}

def main(data_dir: Path):
    if not data_dir.exists():
        print(f"[ERROR] Data dir not found: {data_dir.resolve()}")
        sys.exit(1)

    # Show first two levels of the tree
    def tree(p: Path, depth=2, prefix=""):
        if depth < 0 or not p.is_dir():
            return
        for child in sorted(p.iterdir()):
            marker = "📁" if child.is_dir() else "📄"
            print(prefix + f"{marker} {child.name}")
            if child.is_dir():
                tree(child, depth-1, prefix + "   ")

    print("== Data directory ==", data_dir.resolve())
    tree(data_dir, depth=2)

    # Count images
    img_files = [p for p in data_dir.rglob("*") if p.suffix.lower() in IMAGE_EXTS]
    print("\nTotal image files:", len(img_files))

    if not img_files:
        print("[WARN] No images found with extensions:", ", ".join(sorted(IMAGE_EXTS)))
        sys.exit(0)

    # Try to infer class from immediate parent folder (e.g., Dataset/Real_preprocessed/xxx.jpg)
    labels = [p.parent.name for p in img_files]

    counts = Counter(labels)
    print("\n== Class counts ==")
    total = sum(counts.values())
    for cls, n in counts.most_common():
        pct = (n / total) * 100 if total else 0
        print(f"{cls:20s} {n:6d}  ({pct:5.1f}%)")

    # Basic balance check
    if len(counts) == 2:
        a, b = counts.most_common()
        bigger, smaller = a[1], b[1]
        ratio = bigger / max(smaller, 1)
        if ratio > 1.5:
            print("\n[NOTE] Dataset looks imbalanced. We may use class weights or augmentation.")
    print("\n✅ Scan complete.")

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--data-dir", default="Dataset", help="Path to dataset root")
    args = ap.parse_args()
    main(Path(args.data_dir))
