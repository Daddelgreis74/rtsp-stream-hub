const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dbDir = path.join(__dirname, '../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Create users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      can_edit_cameras INTEGER NOT NULL DEFAULT 1,
      can_view_cameras INTEGER NOT NULL DEFAULT 1
    )
  `);

  // Create cameras table
  db.run(`
    CREATE TABLE IF NOT EXISTS cameras (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      stream_type TEXT NOT NULL DEFAULT 'auto',
      refresh_interval INTEGER NOT NULL DEFAULT 2
    )
  `);

  // Migrations for existing databases
  db.run(`ALTER TABLE cameras ADD COLUMN stream_type TEXT DEFAULT 'auto'`, () => {});
  db.run(`ALTER TABLE cameras ADD COLUMN refresh_interval INTEGER DEFAULT 2`, () => {});

  // Seed default admin if table is empty
  db.get('SELECT COUNT(*) as count FROM users', [], (err, row) => {
    if (err) {
      console.error('Error checking user count:', err.message);
      return;
    }
    if (row.count === 0) {
      const defaultUser = 'admin';
      const defaultPass = 'admin';
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(defaultPass, salt);
      db.run(
        'INSERT INTO users (username, password, role, can_edit_cameras, can_view_cameras) VALUES (?, ?, ?, ?, ?)',
        [defaultUser, hash, 'admin', 1, 1],
        (insertErr) => {
          if (insertErr) {
            console.error('Error seeding default admin:', insertErr.message);
          } else {
            console.log('Seeded default admin user: admin / admin');
          }
        }
      );
    }
  });
});

module.exports = db;
