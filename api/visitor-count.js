import { config } from 'dotenv';
import { db } from '../firebase-config.js';
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { randomBytes } from 'crypto';

config({ path: '.env.local' });

function generateSessionId() {
  return 'session_' + randomBytes(16).toString('hex');
}

function setSessionCookie(res, sessionId) {
  const cookieValue = `visitor-session=${sessionId}; HttpOnly; Secure; SameSite=Strict; Max-Age=${365 * 24 * 60 * 60}`;
  res.setHeader('Set-Cookie', cookieValue);
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

async function initializeVisitorCounter() {
  try {
    const docRef = doc(db, 'stats', 'visitor_count');
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      await setDoc(docRef, {
        count: 0,
        unique_sessions: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      console.log('Visitor counter initialized');
    }
  } catch (error) {
    console.error('Error in initializeVisitorCounter:', error);
  }
}

export default async function handler(req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Visitor-ID, X-Visitor-Session');
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
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
      return res.status(500).json({ error: 'Database error' });
    }

    let uniqueSessions = new Set(visitorData.unique_sessions || []);
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
          updated_at: new Date().toISOString()
        });

        console.log('New visitor session', sessionId, 'added. Total count:', visitorCount);
      } catch (error) {
        console.error('Error updating database:', error);
        return res.status(500).json({ error: 'Database update error' });
      }
    }

    res.status(200).json({
      count: visitorCount,
      isNewVisitor: isNewVisitor,
      sessionId: sessionId,
      isNewSession: isNewSession,
      message: 'Using Firebase persistent storage'
    });
  } catch (error) {
    console.error('Visitor count error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Server error',
      message: error.message 
    });
  }
}