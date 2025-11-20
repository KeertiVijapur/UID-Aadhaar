# src/train_resnet.py
import argparse, time
from pathlib import Path

import torch
from torch import nn, optim
from torch.utils.data import DataLoader
from torchvision import datasets, models, transforms
from sklearn.metrics import classification_report, confusion_matrix
import numpy as np

def get_device():
    if torch.backends.mps.is_available():
        return torch.device("mps")
    if torch.cuda.is_available():
        return torch.device("cuda")
    return torch.device("cpu")

def build_dataloaders(root, img_size=224, batch_size=32):
    train_tfm = transforms.Compose([
        transforms.Resize((img_size, img_size)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(5),
        transforms.ColorJitter(brightness=0.1, contrast=0.1),
        transforms.ToTensor(),
        transforms.Normalize([0.485,0.456,0.406], [0.229,0.224,0.225]),
    ])
    val_tfm = transforms.Compose([
        transforms.Resize((img_size, img_size)),
        transforms.ToTensor(),
        transforms.Normalize([0.485,0.456,0.406], [0.229,0.224,0.225]),
    ])

    train_ds = datasets.ImageFolder(Path(root)/"train", transform=train_tfm)
    val_ds   = datasets.ImageFolder(Path(root)/"val",   transform=val_tfm)
    test_ds  = datasets.ImageFolder(Path(root)/"test",  transform=val_tfm)

    # class weights to reduce imbalance effect
    class_counts = np.bincount([y for _, y in train_ds.samples])
    class_counts = class_counts.astype(float)
    weights = (1.0 / np.maximum(class_counts, 1))
    weights = weights / weights.sum() * len(weights)
    class_weights = torch.tensor(weights, dtype=torch.float32)

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True, num_workers=2, pin_memory=True)
    val_loader   = DataLoader(val_ds,   batch_size=batch_size, shuffle=False, num_workers=2, pin_memory=True)
    test_loader  = DataLoader(test_ds,  batch_size=batch_size, shuffle=False, num_workers=2, pin_memory=True)

    return train_loader, val_loader, test_loader, train_ds.classes, class_weights

def build_model(num_classes, device):
    model = models.resnet18(weights=models.ResNet18_Weights.DEFAULT)
    for p in model.parameters():
        p.requires_grad = False  # freeze backbone first
    in_feats = model.fc.in_features
    model.fc = nn.Sequential(
        nn.Dropout(0.3),
        nn.Linear(in_feats, num_classes)
    )
    return model.to(device)

def train_one_epoch(model, loader, criterion, optimizer, device):
    model.train()
    running_loss, correct, total = 0.0, 0, 0
    for x, y in loader:
        x, y = x.to(device), y.to(device)
        optimizer.zero_grad()
        out = model(x)
        loss = criterion(out, y)
        loss.backward()
        optimizer.step()
        running_loss += loss.item() * x.size(0)
        preds = out.argmax(1)
        correct += (preds == y).sum().item()
        total += y.size(0)
    return running_loss/total, correct/total

@torch.no_grad()
def evaluate(model, loader, criterion, device):
    model.eval()
    running_loss, correct, total = 0.0, 0, 0
    all_y, all_p = [], []
    for x, y in loader:
        x, y = x.to(device), y.to(device)
        out = model(x)
        loss = criterion(out, y)
        running_loss += loss.item() * x.size(0)
        preds = out.argmax(1)
        correct += (preds == y).sum().item()
        total += y.size(0)
        all_y.append(y.cpu().numpy()); all_p.append(preds.cpu().numpy())
    all_y = np.concatenate(all_y); all_p = np.concatenate(all_p)
    return running_loss/total, correct/total, all_y, all_p

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data-root", default="data_splits", help="train/val/test folders")
    ap.add_argument("--epochs", type=int, default=10)
    ap.add_argument("--batch-size", type=int, default=32)
    ap.add_argument("--lr", type=float, default=1e-3)
    ap.add_argument("--img-size", type=int, default=224)
    ap.add_argument("--out-dir", default="artifacts")
    args = ap.parse_args()

    device = get_device()
    print("Device:", device)

    train_loader, val_loader, test_loader, classes, class_weights = build_dataloaders(
        args.data_root, img_size=args.img_size, batch_size=args.batch_size
    )
    num_classes = len(classes)
    print("Classes:", classes)

    model = build_model(num_classes, device)
    criterion = nn.CrossEntropyLoss(weight=class_weights.to(device))
    optimizer = optim.Adam(model.parameters(), lr=args.lr)

    out_dir = Path(args.out_dir); out_dir.mkdir(parents=True, exist_ok=True)
    best_val_acc, best_path = 0.0, out_dir / "best_resnet18.pt"
    patience, bad_epochs = 3, 0

    print("\n== Training ==")
    for epoch in range(1, args.epochs+1):
        t0 = time.time()
        tr_loss, tr_acc = train_one_epoch(model, train_loader, criterion, optimizer, device)
        val_loss, val_acc, _, _ = evaluate(model, val_loader, criterion, device)
        dt = time.time()-t0
        print(f"Epoch {epoch:02d} | {dt:5.1f}s  | train loss {tr_loss:.4f} acc {tr_acc:.3f} | val loss {val_loss:.4f} acc {val_acc:.3f}")

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            torch.save(model.state_dict(), best_path)
            bad_epochs = 0
            print(f"  ↳ saved new best to {best_path}")
        else:
            bad_epochs += 1
            if bad_epochs >= patience:
                print("Early stopping.")
                break

    # Load best and unfreeze for fine-tuning
    print("\n== Fine-tuning backbone (unfreeze) ==")
    model.load_state_dict(torch.load(best_path, map_location=device))
    for p in model.parameters():
        p.requires_grad = True
    optimizer = optim.Adam(model.parameters(), lr=args.lr/10)

    for epoch in range(1, 4):  # small FT
        tr_loss, tr_acc = train_one_epoch(model, train_loader, criterion, optimizer, device)
        val_loss, val_acc, _, _ = evaluate(model, val_loader, criterion, device)
        print(f"[FT] Epoch {epoch:02d} | train {tr_acc:.3f} | val {val_acc:.3f}")

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            torch.save(model.state_dict(), best_path)
            print(f"  ↳ saved new best to {best_path}")

    # Final test
    print("\n== Testing on held-out set ==")
    model.load_state_dict(torch.load(best_path, map_location=device))
    test_loss, test_acc, y_true, y_pred = evaluate(model, test_loader, criterion, device)
    print(f"Test loss {test_loss:.4f} | Test acc {test_acc:.3f}\n")
    print("Classification report:")
    print(classification_report(y_true, y_pred, target_names=classes))
    print("Confusion matrix:")
    print(confusion_matrix(y_true, y_pred))

    # Save class names for inference
    with open(Path(args.out_dir)/"classes.txt", "w") as f:
        for c in classes:
            f.write(c + "\n")
    print("\nArtifacts saved in:", out_dir.resolve())

if __name__ == "__main__":
    main()
