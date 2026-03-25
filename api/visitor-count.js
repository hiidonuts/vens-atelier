import fs from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';

const VISITOR_DATA_FILE = path.join(process.cwd(), 'visitor-data.json');

// Initialize visitor data file if it doesn't exist
function initializeVisitorData() {
  if (!fs.existsSync(VISITOR_DATA_FILE)) {
    const initialData = {
      uniqueSessions: [],
      count: 0,
      lastUpdated: new Date().toISOString()
    };
    fs.writeFileSync(VISITOR_DATA_FILE, JSON.stringify(initialData, null, 2));
  }
}

// Read visitor data from file
function readVisitorData() {
  try {
    const data = fs.readFileSync(VISITOR_DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.log('Error reading visitor data, initializing:', error.message);
    initializeVisitorData();
    return { uniqueSessions: [], count: 0, lastUpdated: new Date().toISOString() };
  }
}

// Write visitor data to file
function writeVisitorData(data) {
  try {
    data.lastUpdated = new Date().toISOString();
    fs.writeFileSync(VISITOR_DATA_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing visitor data:', error);
  }
}

// Generate a unique session ID
function generateSessionId() {
  return 'session_' + randomBytes(16).toString('hex');
}

// Set session cookie
function setSessionCookie(res, sessionId) {
  const cookieValue = `visitor-session=${sessionId}; HttpOnly; Secure; SameSite=Strict; Max-Age=${365 * 24 * 60 * 60}`; // 1 year
  res.setHeader('Set-Cookie', cookieValue);
}

// Get session ID from request
function getSessionId(req) {
  // Check for session cookie first
  const cookies = req.headers.cookie || '';
  const sessionMatch = cookies.match(/visitor-session=([^;]+)/);
  if (sessionMatch) {
    return sessionMatch[1];
  }
  
  // Check for custom header as fallback
  const customSessionId = req.headers['x-visitor-session'];
  if (customSessionId) {
    return customSessionId;
  }
  
  return null;
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

    // Get existing session ID or create new one
    let sessionId = getSessionId(req);
    let isNewSession = false;
    
    if (!sessionId) {
      sessionId = generateSessionId();
      isNewSession = true;
      setSessionCookie(res, sessionId);
      console.log('New session created:', sessionId);
    }

    console.log('Processing visitor session:', sessionId);

    // Initialize and read visitor data
    initializeVisitorData();
    let visitorData = readVisitorData();
    
    // Use Set for unique session tracking
    let uniqueSessions = new Set(visitorData.uniqueSessions || []);
    let visitorCount = visitorData.count || 0;

    const isNewVisitor = !uniqueSessions.has(sessionId);
    
    if (isNewVisitor) {
      uniqueSessions.add(sessionId);
      visitorCount++;
      
      // Update visitor data
      visitorData.uniqueSessions = [...uniqueSessions];
      visitorData.count = visitorCount;
      
      // Save to file
      writeVisitorData(visitorData);
      
      console.log('New visitor session', sessionId, 'added. Total count:', visitorCount);
    }

    res.status(200).json({
      count: visitorCount,
      isNewVisitor: isNewVisitor,
      sessionId: sessionId,
      isNewSession: isNewSession,
      message: 'Using JSON file storage with session tracking'
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