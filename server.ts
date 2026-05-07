import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import axios from "axios";
import cookieParser from "cookie-parser";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cookieParser());

// Handle API routes before Vite middleware
app.all('/api/*', async (req, res, next) => {
  try {
    const visitorCountHandler = await import('./api/visitor-count.js');
    if (req.path === '/api/visitor-count') {
      return visitorCountHandler.default(req, res);
    }
    next();
  } catch (error) {
    console.error('API route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
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
