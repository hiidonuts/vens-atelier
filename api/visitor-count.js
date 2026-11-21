import { randomBytes } from 'crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCAL_STORE_PATH = join(__dirname, '..', '.data', 'visitor-count.json');
const PROD_PEEK_URL = 'https://vens-atelier.vercel.app/api/visitor-count?peek=1';

function hasFirebaseConfig() {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID?.trim() &&
      process.env.FIREBASE_API_KEY?.trim()
  );
}

function generateSessionId() {
  return 'session_' + randomBytes(16).toString('hex');
}

function setSessionCookie(res, sessionId) {
  const isProd = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
  const parts = [
    `visitor-session=${sessionId}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    `Max-Age=${365 * 24 * 60 * 60}`,
  ];
  if (isProd) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

function getSessionId(req) {
  const cookies = req.headers.cookie || '';
  const sessionMatch = cookies.match(/visitor-session=([^;]+)/);
  if (sessionMatch) {
    return sessionMatch[1];
  }

  const customSessionId = req.headers['x-visitor-session'];
  if (customSessionId) {
    return customSessionId;
  }

  return null;
}

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  const allowed = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://vens-atelier.vercel.app',
  ];

  if (origin && (allowed.includes(origin) || origin.endsWith('.vercel.app'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Visitor-ID, X-Visitor-Session');
}

function isPeekRequest(req) {
  const url = new URL(req.url || '/', 'http://localhost');
  return url.searchParams.get('peek') === '1';
}

function readLocalStore() {
  try {
    if (!existsSync(LOCAL_STORE_PATH)) {
      return { count: 0, unique_sessions: [] };
    }
    return JSON.parse(readFileSync(LOCAL_STORE_PATH, 'utf8'));
  } catch {
    return { count: 0, unique_sessions: [] };
  }
}

function writeLocalStore(data) {
  mkdirSync(dirname(LOCAL_STORE_PATH), { recursive: true });
  writeFileSync(LOCAL_STORE_PATH, JSON.stringify(data, null, 2));
}

async function peekProductionCount() {
  try {
    const upstream = await fetch(PROD_PEEK_URL, {
      headers: { Accept: 'application/json' },
    });
    if (!upstream.ok) return null;
    const data = await upstream.json();
    // Only trust responses from the peek-capable API (avoids incrementing older deploys).
    if (data?.message === 'Peek only' && typeof data.count === 'number') {
      return data.count;
    }
  } catch (error) {
    console.warn('Production peek unavailable:', error.message);
  }
  return null;
}

async function handleLocal(req, res, { peek }) {
  // Opt-in: set VISITOR_PEEK_PRODUCTION=1 after peek is deployed, to show live count locally.
  if (!peek && process.env.VISITOR_PEEK_PRODUCTION === '1') {
    const productionCount = await peekProductionCount();
    if (productionCount !== null) {
      return res.status(200).json({
        count: productionCount,
        isNewVisitor: false,
        sessionId: null,
        isNewSession: false,
        message: 'Local fallback via production peek',
      });
    }
  }

  const store = readLocalStore();
  if (peek) {
    return res.status(200).json({
      count: store.count || 0,
      isNewVisitor: false,
      sessionId: null,
      isNewSession: false,
      message: 'Local peek',
    });
  }

  let sessionId = getSessionId(req);
  let isNewSession = false;
  if (!sessionId) {
    sessionId = generateSessionId();
    isNewSession = true;
    setSessionCookie(res, sessionId);
  }

  const uniqueSessions = new Set(store.unique_sessions || []);
  let visitorCount = store.count || 0;
  const isNewVisitor = !uniqueSessions.has(sessionId);

  if (isNewVisitor) {
    uniqueSessions.add(sessionId);
    visitorCount += 1;
    writeLocalStore({
      count: visitorCount,
      unique_sessions: [...uniqueSessions],
      updated_at: new Date().toISOString(),
    });
  }

  return res.status(200).json({
    count: visitorCount,
    isNewVisitor,
    sessionId,
    isNewSession,
    message: 'Using local file storage (Firebase env missing)',
  });
}

async function handleFirebase(req, res, { peek }) {
  const { db } = await import('../firebase-config.js');
  const { doc, getDoc, setDoc, updateDoc, arrayUnion } = await import('firebase/firestore');

  const docRef = doc(db, 'stats', 'visitor_count');
  let docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    await setDoc(docRef, {
      count: 0,
      unique_sessions: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    docSnap = await getDoc(docRef);
  }

  if (!docSnap.exists()) {
    return res.status(500).json({ error: 'Database error' });
  }

  const visitorData = docSnap.data();
  const visitorCount = visitorData.count || 0;

  if (peek) {
    return res.status(200).json({
      count: visitorCount,
      isNewVisitor: false,
      sessionId: null,
      isNewSession: false,
      message: 'Peek only',
    });
  }

  let sessionId = getSessionId(req);
  let isNewSession = false;

  if (!sessionId) {
    sessionId = generateSessionId();
    isNewSession = true;
    setSessionCookie(res, sessionId);
  }

  const uniqueSessions = new Set(visitorData.unique_sessions || []);
  let nextCount = visitorCount;
  const isNewVisitor = !uniqueSessions.has(sessionId);

  if (isNewVisitor) {
    nextCount += 1;
    await updateDoc(docRef, {
      count: nextCount,
      unique_sessions: arrayUnion(sessionId),
      updated_at: new Date().toISOString(),
    });
  }

  return res.status(200).json({
    count: nextCount,
    isNewVisitor,
    sessionId,
    isNewSession,
    message: 'Using Firebase persistent storage',
  });
}

export default async function handler(req, res) {
  try {
    setCorsHeaders(req, res);

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const peek = isPeekRequest(req);

    if (!hasFirebaseConfig()) {
      console.warn('Firebase env missing/empty — using local fallback');
      return handleLocal(req, res, { peek });
    }

    return await handleFirebase(req, res, { peek });
  } catch (error) {
    console.error('Visitor count error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: 'Server error',
      message: error.message,
    });
  }
}
