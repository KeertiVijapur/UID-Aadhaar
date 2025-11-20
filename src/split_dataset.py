# src/split_dataset.py
import argparse, random, shutil
from pathlib import Path
from collections import defaultdict

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".webp"}

def gather_images(root: Path):
    files_by_class = defaultdict(list)
    for p in root.rglob("*"):
        if p.is_file() and p.suffix.lower() in IMAGE_EXTS:
            cls = p.parent.name  # e.g., Fake_preprocessed / Real_preprocessed
            files_by_class[cls].append(p)
    return files_by_class

def split_list(items, train_ratio, val_ratio, seed=42):
    random.Random(seed).shuffle(items)
    n = len(items)
    n_train = int(n * train_ratio)
    n_val = int(n * val_ratio)
    train = items[:n_train]
    val = items[n_train:n_train+n_val]
    test = items[n_train+n_val:]
    return train, val, test

def copy_files(files, out_dir: Path, class_name: str):
    (out_dir / class_name).mkdir(parents=True, exist_ok=True)
    for src in files:
        dst = out_dir / class_name / src.name
        shutil.copy2(src, dst)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data-dir", default="Dataset", help="Path to source dataset root")
    ap.add_argument("--out-dir", default="data_splits", help="Where to write train/val/test folders")
    ap.add_argument("--train-ratio", type=float, default=0.70)
    ap.add_argument("--val-ratio", type=float, default=0.15)
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()

    src_root = Path(args.data_dir)
    out_root = Path(args.out_dir)

    assert abs(args.train_ratio + args.val_ratio - 1.0) < 1e-6 or args.train_ratio + args.val_ratio < 1.0, \
        "Train + Val must be <= 1.0 (remainder goes to Test)."

    files_by_class = gather_images(src_root)
    if not files_by_class:
        raise SystemExit(f"[ERROR] No images found under {src_root.resolve()}")

    # Optional: normalize class names to simple labels
    def normalize(cls):
        c = cls.lower()
        if "fake" in c: return "fake"
        if "real" in c: return "real"
        return cls  # fallback

    # Prepare output dirs
    for split in ["train", "val", "test"]:
        (out_root / split).mkdir(parents=True, exist_ok=True)

    print("Source:", src_root.resolve())
    print("Output:", out_root.resolve())

    # Split per class
    summary = {}
    for cls, files in files_by_class.items():
        n = len(files)
        n_train = int(n * args.train_ratio)
        n_val = int(n * args.val_ratio)
        n_test = n - n_train - n_val
        print(f"\nClass '{cls}': {n} images  -> train {n_train}, val {n_val}, test {n_test}")

        train, val, test = split_list(files, args.train_ratio, args.val_ratio, seed=args.seed)

        norm = normalize(cls)
        copy_files(train, out_root / "train", norm)
        copy_files(val,   out_root / "val",   norm)
        copy_files(test,  out_root / "test",  norm)

        summary[norm] = {
            "total": n, "train": len(train), "val": len(val), "test": len(test)
        }

    # Final tally
    print("\n== Split summary ==")
    for cls, s in summary.items():
        print(f"{cls:>8} | total:{s['total']:4d}  train:{s['train']:4d}  val:{s['val']:4d}  test:{s['test']:4d}")
    print("\n✅ Done. Folders created under:", out_root.resolve())

if __name__ == "__main__":
    main()
