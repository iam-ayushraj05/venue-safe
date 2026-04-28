const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const isCloudRun = !!process.env.K_SERVICE || !!process.env.PORT;
const sourceDbPath = path.resolve(__dirname, 'venuesafe.db');
let dbPath = sourceDbPath;

if (isCloudRun) {
  dbPath = '/tmp/venuesafe.db';
  if (!fs.existsSync(dbPath)) {
    try {
      if (fs.existsSync(sourceDbPath)) {
        fs.copyFileSync(sourceDbPath, dbPath);
        console.log('Copied venuesafe.db to /tmp for write access.');
      }
    } catch (e) {
      console.error('Failed to copy database to /tmp:', e);
    }
  }
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    
    // Prevent unhandled error events from crashing the Node process
    db.on('error', (dbErr) => {
      console.error('SQLite Global Error:', dbErr.message);
    });

    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS incidents (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT,
          description TEXT,
          severity TEXT,
          category TEXT,
          zone TEXT,
          status TEXT DEFAULT 'active',
          ai_action_plan TEXT,
          confidence_score INTEGER,
          evacuation_route TEXT,
          responder_allocations TEXT,
          is_sensor BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);
  
      db.run(`CREATE TABLE IF NOT EXISTS guests (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT,
          zone TEXT,
          status TEXT,
          original_message TEXT,
          translated_message TEXT,
          priority_level TEXT,
          is_injured BOOLEAN DEFAULT 0,
          evacuation_route TEXT,
          detected_language TEXT,
          detected_category TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS responders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT,
          zone TEXT,
          status TEXT,
          eta INTEGER,
          check_in_time DATETIME,
          is_safe BOOLEAN DEFAULT 1
      )`);

      // Auto-migrate if columns don't exist
      db.run("ALTER TABLE incidents ADD COLUMN responder_allocations TEXT", () => {});
      db.run("ALTER TABLE incidents ADD COLUMN confidence_score INTEGER", () => {});
      db.run("ALTER TABLE incidents ADD COLUMN evacuation_route TEXT", () => {});
      db.run("ALTER TABLE incidents ADD COLUMN is_sensor BOOLEAN DEFAULT 0", () => {});
      
      db.run("ALTER TABLE guests ADD COLUMN detected_language TEXT", () => {});
      db.run("ALTER TABLE guests ADD COLUMN detected_category TEXT", () => {});
      db.run("ALTER TABLE guests ADD COLUMN is_injured BOOLEAN DEFAULT 0", () => {});
      db.run("ALTER TABLE guests ADD COLUMN evacuation_route TEXT", () => {});

      db.run(`CREATE TABLE IF NOT EXISTS muster_points (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        zone TEXT NOT NULL,
        qr_code TEXT UNIQUE,
        current_count INTEGER DEFAULT 0
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS muster_checkins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guest_name TEXT,
        zone TEXT,
        muster_point_id INTEGER,
        is_injured BOOLEAN DEFAULT 0,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (muster_point_id) REFERENCES muster_points(id)
      )`);

      db.run(`INSERT OR IGNORE INTO muster_points (zone, qr_code) VALUES 
        ('LOBBY ZONE A', 'muster_lobby_a'),
        ('GRAND BALLROOM ZONE B', 'muster_ballroom_b'),
        ('RESTAURANT ZONE C', 'muster_restaurant_c'),
        ('POOL DECK ZONE D', 'muster_pool_d')
      `);
    });
  }
});

module.exports = db;
