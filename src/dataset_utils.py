# src/dataset_utils.py
from pathlib import Path
import pandas as pd
from typing import Optional

# Path to the CSV file containing verified Aadhaar numbers
# Create this CSV (example below) at project root or change the path.
CSV_PATH = Path("verified_aadhaar.csv")

def load_dataset() -> pd.DataFrame:
    """
    Load the verified dataset into a DataFrame.
    The CSV should have at least one column named 'aadhaar_number' (12-digit as string).
    """
    if not CSV_PATH.exists():
        # return empty DataFrame with expected column if file missing
        return pd.DataFrame(columns=["aadhaar_number", "name", "dob", "gender"])
    df = pd.read_csv(CSV_PATH, dtype={"aadhaar_number": str})
    # normalize: remove spaces/dashes
    df["aadhaar_number"] = df["aadhaar_number"].astype(str).str.replace(r"\D", "", regex=True)
    return df

# cache dataset in memory (reload on process restart)
_DATASET_DF = load_dataset()

def is_aadhaar_present(aadhaar: Optional[str]) -> bool:
    """Return True if aadhaar (12 digits) exists in dataset."""
    if not aadhaar:
        return False
    s = "".join(ch for ch in str(aadhaar) if ch.isdigit())
    if len(s) != 12:
        return False
    return s in set(_DATASET_DF["aadhaar_number"].dropna().astype(str).values)

def get_record(aadhaar: Optional[str]) -> dict | None:
    """Return record dict if present, else None."""
    if not aadhaar:
        return None
    s = "".join(ch for ch in str(aadhaar) if ch.isdigit())
    if len(s) != 12:
        return None
    row = _DATASET_DF[_DATASET_DF["aadhaar_number"] == s]
    if row.empty:
        return None
    # return first match as dict
    rec = row.iloc[0].to_dict()
    return {k: (None if pd.isna(v) else v) for k, v in rec.items()}
