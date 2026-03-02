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
`);

// API Routes
app.get("/api/visitor-count", (req, res) => {
  const row = db.prepare("SELECT count FROM visitor_count WHERE id = 1").get() as { count: number };
  
  // Increment count on each request (or use a session cookie to count unique visitors)
  const newCount = row.count + 1;
  db.prepare("UPDATE visitor_count SET count = ? WHERE id = 1").run(newCount);
  
  res.json({ count: newCount });
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
