import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import axios from "axios";
import cookieParser from "cookie-parser";
import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cookieParser());

// Initialize Database
const db = new Database("archive.db");
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

// API Routes
app.get("/api/visitor-count", (req, res) => {
  const row = db.prepare("SELECT count FROM visitor_count WHERE id = 1").get() as { count: number };
  
  // Check if visitor has already been counted using a unique identifier
  const visitorId = req.headers['x-visitor-id'] || req.ip; // Fallback to IP
  console.log('Server received visitor ID:', visitorId); // Debug log
  
  const existingVisitor = db.prepare("SELECT * FROM unique_visitors WHERE visitor_id = ?").get(visitorId);
  console.log('Existing visitor:', existingVisitor); // Debug log
  
  let newCount = row.count;
  
  if (!existingVisitor) {
    // New visitor - increment count and track them
    newCount = row.count + 1;
    db.prepare("UPDATE visitor_count SET count = ? WHERE id = 1").run(newCount);
    db.prepare("INSERT INTO unique_visitors (visitor_id, visited_at) VALUES (?, datetime('now'))").run(visitorId);
    console.log('New visitor! Count is now:', newCount); // Debug log
  }
  
  res.json({ count: newCount, isNewVisitor: !existingVisitor });
});

// Debug endpoint to see current visitors
app.get("/api/debug-visitors", (req, res) => {
  const count = db.prepare("SELECT count FROM visitor_count WHERE id = 1").get() as { count: number };
  const visitors = db.prepare("SELECT * FROM unique_visitors ORDER BY visited_at DESC LIMIT 10").all();
  res.json({ total: count, visitors });
});

// Vite middleware for development
if (process.env.NODE_ENV !== "production") {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(join(__dirname, "dist")));
  app.get("*", (req, res) => {
    res.sendFile(join(__dirname, "dist", "index.html"));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
