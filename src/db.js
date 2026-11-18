const sqlite3 = require('sqlite3');
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
  // Performance & Concurrency PRAGMAs for low-latency reads/writes
  db.run('PRAGMA journal_mode = WAL;');
  db.run('PRAGMA synchronous = NORMAL;');
  db.run('PRAGMA busy_timeout = 5000;');
  db.run('PRAGMA temp_store = MEMORY;');
  db.run('PRAGMA cache_size = -8000;'); // ~8 MB page cache in RAM

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

  // Index on role for fast admin count checks
  db.run('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);');

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

  // Seed default admin if table is empty (using async bcrypt to avoid blocking startup)
  db.get('SELECT COUNT(*) as count FROM users', [], (err, row) => {
    if (err) {
      console.error('Error checking user count:', err.message);
      return;
    }
    if (row && row.count === 0) {
      const defaultUser = 'admin';
      const defaultPass = 'admin';
      bcrypt.hash(defaultPass, 10).then((hash) => {
        db.run(
          'INSERT OR IGNORE INTO users (username, password, role, can_edit_cameras, can_view_cameras) VALUES (?, ?, ?, ?, ?)',
          [defaultUser, hash, 'admin', 1, 1],
          (insertErr) => {
            if (insertErr) {
              console.error('Error seeding default admin:', insertErr.message);
            } else {
              console.log('Seeded default admin user: admin / admin');
            }
          }
        );
      }).catch((hashErr) => {
        console.error('Error hashing default admin password:', hashErr.message);
      });
    }
  });
});

module.exports = db;
