import Database from "better-sqlite3";
import cookieParser from "cookie-parser";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";

// Ensure database directory exists
const dbPath = join(process.cwd(), 'archive.db');
let db;

try {
  db = new Database(dbPath);
  
  // Initialize database tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS visitor_count (
      id INTEGER PRIMARY KEY,
      count INTEGER DEFAULT 0
    );
    INSERT OR IGNORE INTO visitor_count (id, count) VALUES (1, 0);
    
    CREATE TABLE IF NOT EXISTS unique_visitors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      visitor_id TEXT UNIQUE,
      visited_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
} catch (error) {
  console.error('Database initialization error:', error);
  // Create in-memory database as fallback
  db = new Database(':memory:');
  db.exec(`
    CREATE TABLE IF NOT EXISTS visitor_count (
      id INTEGER PRIMARY KEY,
      count INTEGER DEFAULT 0
    );
    INSERT OR IGNORE INTO visitor_count (id, count) VALUES (1, 0);
    
    CREATE TABLE IF NOT EXISTS unique_visitors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      visitor_id TEXT UNIQUE,
      visited_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Visitor-ID');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const row = db.prepare("SELECT count FROM visitor_count WHERE id = 1").get();
    const count = row ? row.count : 0;
    
    // Check if visitor has already been counted using a unique identifier
    const visitorId = req.headers['x-visitor-id'] || req.ip; // Fallback to IP
    
    const existingVisitor = db.prepare("SELECT * FROM unique_visitors WHERE visitor_id = ?").get(visitorId);
    
    let newCount = count;
    
    if (!existingVisitor) {
      // New visitor - increment count and track them
      newCount = count + 1;
      db.prepare("UPDATE visitor_count SET count = ? WHERE id = 1").run(newCount);
      db.prepare("INSERT INTO unique_visitors (visitor_id, visited_at) VALUES (?, datetime('now'))").run(visitorId);
    }
    
    res.json({ count: newCount, isNewVisitor: !existingVisitor });
  } catch (error) {
    console.error('Visitor count error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
