import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

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
    const { data, error } = await supabase
      .from('visitor_stats')
      .select('count')
      .single();

    if (error && error.code === 'PGRST116') {
      const { error: insertError } = await supabase
        .from('visitor_stats')
        .insert({ count: 0, unique_sessions: [] });
      
      if (insertError) {
        console.error('Error initializing visitor counter:', insertError);
      } else {
        console.log('Visitor counter initialized');
      }
    } else if (error) {
      console.error('Error checking visitor counter:', error);
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
      const { data, error } = await supabase
        .from('visitor_stats')
        .select('*')
        .single();

      if (error) {
        console.error('Error fetching visitor data:', error);
        return res.status(500).json({ error: 'Database error' });
      }

      visitorData = data;
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
        const { error: updateError } = await supabase
          .from('visitor_stats')
          .update({
            count: visitorCount,
            unique_sessions: [...uniqueSessions],
            updated_at: new Date().toISOString()
          })
          .eq('id', visitorData.id);

        if (updateError) {
          console.error('Error updating visitor data:', updateError);
          return res.status(500).json({ error: 'Database update error' });
        }

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
      message: 'Using Supabase persistent storage'
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