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
        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            owner_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            body TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS app_state (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            csrf_token TEXT NOT NULL,
            notifications_enabled INTEGER NOT NULL
        );
        DELETE FROM users;
        DELETE FROM documents;
        DELETE FROM app_state;
        INSERT INTO users(username, password, role) VALUES
            ('alice', 'alice123', 'user'),
            ('admin', 'super-secret', 'admin');
        INSERT INTO documents(owner_id, title, body) VALUES
            (1, 'Alice incident notes', 'Confidential case notes for alice'),
            (2, 'Admin security memo', 'Privileged memo for admin only');
        INSERT INTO app_state(id, csrf_token, notifications_enabled) VALUES
            (1, 'csrf-demo-token', 1);
        '''
    )
    conn.commit()
    conn.close()


if __name__ == '__main__':
    seed_db()
