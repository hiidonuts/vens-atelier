import { db } from '../firebase-config.js';
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { randomBytes } from 'crypto';

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

async function initializeVisitorCounter() {
  try {
    const docRef = doc(db, 'stats', 'visitor_count');
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      await setDoc(docRef, {
        count: 0,
        unique_sessions: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      console.log('Visitor counter initialized');
    }
  } catch (error) {
    console.error('Error in initializeVisitorCounter:', error);
    throw error;
  }
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

    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_API_KEY) {
      console.error('Missing Firebase environment variables');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    let sessionId = getSessionId(req);
    let isNewSession = false;

    if (!sessionId) {
      sessionId = generateSessionId();
      isNewSession = true;
      setSessionCookie(res, sessionId);
      console.log('New session created:', sessionId);
    }

    console.log('Processing visitor session:', sessionId);

    await initializeVisitorCounter();

    let visitorData;
    try {
      const docRef = doc(db, 'stats', 'visitor_count');
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        console.error('Visitor counter document not found');
        return res.status(500).json({ error: 'Database error' });
      }

      visitorData = docSnap.data();
    } catch (error) {
      console.error('Error in database query:', error);
      return res.status(500).json({ error: 'Database error', message: error.message });
    }

    const uniqueSessions = new Set(visitorData.unique_sessions || []);
    let visitorCount = visitorData.count || 0;
    const isNewVisitor = !uniqueSessions.has(sessionId);

    if (isNewVisitor) {
      uniqueSessions.add(sessionId);
      visitorCount++;

      try {
        const docRef = doc(db, 'stats', 'visitor_count');
        await updateDoc(docRef, {
          count: visitorCount,
          unique_sessions: arrayUnion(sessionId),
          updated_at: new Date().toISOString(),
        });

        console.log('New visitor session', sessionId, 'added. Total count:', visitorCount);
      } catch (error) {
        console.error('Error updating database:', error);
        return res.status(500).json({ error: 'Database update error', message: error.message });
      }
    }

    res.status(200).json({
      count: visitorCount,
      isNewVisitor,
      sessionId,
      isNewSession,
      message: 'Using Firebase persistent storage',
    });
  } catch (error) {
    console.error('Visitor count error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: 'Server error',
      message: error.message,
    });
  }
}
