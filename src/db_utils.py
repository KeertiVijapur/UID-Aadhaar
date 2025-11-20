import sqlite3
from pathlib import Path

DATA_DIR = Path("data")
DB_PATH = DATA_DIR / "aadhaar.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS persons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    aadhaar TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    dob TEXT NOT NULL,
    gender TEXT NOT NULL,
    address TEXT
);
"""

SEED_DATA = [
    ("111122223333","Aarav Sharma","05/03/1990","Male","12 MG Road, Bengaluru, Karnataka - 560001"),
    ("111122223334","Vivaan Verma","12/07/1985","Male","5 Anna Salai, Chennai, Tamil Nadu - 600002"),
    ("111122223335","Aditya Iyer","23/11/1992","Male","44 Park Street, Kolkata, West Bengal - 700016"),
    ("111122223336","Vihaan Reddy","01/01/1988","Male","7 Brigade Road, Bengaluru, Karnataka - 560025"),
    ("111122223337","Arjun Patel","14/02/1979","Male","18 FC Road, Pune, Maharashtra - 411004"),
    ("111122223338","Sai Gupta","30/06/1995","Male","9 Baner Road, Pune, Maharashtra - 411045"),
    ("111122223339","Ayaan Sinha","19/09/1982","Male","22 Banjara Hills, Hyderabad, Telangana - 500034"),
    ("111122223340","Krishna Menon","08/05/1975","Male","2 VK Road, Kochi, Kerala - 682001"),
    ("111122223341","Ishaan Nair","27/10/1989","Male","56 VIP Road, Chennai, Tamil Nadu - 600006"),
    ("111122223342","Ritvik Chowdhury","09/12/1991","Male","101 Ring Road, Kolkata, West Bengal - 700021"),
    ("111122223343","Ananya Mishra","17/04/1993","Female","33 MG Road, Lucknow, Uttar Pradesh - 226001"),
    ("111122223344","Diya Yadav","29/08/1996","Female","8 Anna Salai, Chennai, Tamil Nadu - 600018"),
    ("111122223345","Ira Rao","11/11/1987","Female","77 Park Street, Kolkata, West Bengal - 700017"),
    ("111122223346","Pari Kulkarni","04/06/1994","Female","3 Brigade Road, Bengaluru, Karnataka - 560019"),
    ("111122223347","Aadhya Mehta","20/02/1983","Female","12 FC Road, Pune, Maharashtra - 411003"),
    ("111122223348","Myra Agarwal","25/05/1990","Female","66 Baner Road, Pune, Maharashtra - 411051"),
    ("111122223349","Anika Jain","02/09/1986","Female","91 Banjara Hills, Hyderabad, Telangana - 500033"),
    ("111122223350","Navya Bose","13/07/1998","Female","14 VK Road, Kolkata, West Bengal - 700019"),
    ("111122223351","Saanvi Mukherjee","06/01/1978","Female","40 VIP Road, Chennai, Tamil Nadu - 600007"),
    ("111122223352","Ishika Das","21/03/1999","Female","5 Ring Road, Jaipur, Rajasthan - 302001"),
]

def ensure_data_dir():
    DATA_DIR.mkdir(parents=True, exist_ok=True)

def init_db(seed: bool = True):
    ensure_data_dir()
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.executescript(SCHEMA)
    conn.commit()
    if seed:
        cur.execute("DELETE FROM persons;")
        for aadhaar, name, dob, gender, address in SEED_DATA:
            cur.execute(
                "INSERT OR IGNORE INTO persons (aadhaar, name, dob, gender, address) VALUES (?, ?, ?, ?, ?)",
                (aadhaar, name, dob, gender, address)
            )
        conn.commit()
    conn.close()
    return DB_PATH

def get_person_by_aadhaar(aadhaar: str):
    a = "".join(ch for ch in aadhaar if ch.isdigit())
    if len(a) != 12:
        return None
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("SELECT aadhaar, name, dob, gender, address FROM persons WHERE aadhaar = ?", (a,))
    row = cur.fetchone()
    conn.close()
    if not row:
        return None
    return dict(row)