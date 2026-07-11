import { open } from 'sqlite'
import sqlite3 from 'sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

import { mkdirSync } from 'fs'

const DATA_DIR = join(__dirname, '../../data')
const DB_PATH = join(DATA_DIR, 'database.sqlite')

mkdirSync(DATA_DIR, { recursive: true })

let db

export async function getDb() {
  if (db) return db

  db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database,
  })

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      stationuuid TEXT NOT NULL,
      name TEXT NOT NULL,
      favicon TEXT,
      url_resolved TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_favorites_user_station
      ON favorites(user_id, stationuuid);
  `)

  return db
}
