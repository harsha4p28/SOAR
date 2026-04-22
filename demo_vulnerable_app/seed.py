import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / 'data' / 'lab.db'


def seed_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.executescript(
        '''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL
        );
        DELETE FROM users;
        INSERT INTO users(username, password, role) VALUES
            ('alice', 'alice123', 'user'),
            ('admin', 'super-secret', 'admin');
        '''
    )
    conn.commit()
    conn.close()


if __name__ == '__main__':
    seed_db()
