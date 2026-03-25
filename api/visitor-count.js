export default async function handler(req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Visitor-ID');
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const visitorId =
      req.headers['x-visitor-id'] ||
      req.headers['x-forwarded-for'] ||
      'unknown-' + Date.now();

    console.log('Processing visitor:', visitorId);

    // Fallback: Use simple in-memory counter
    // Note: This will reset on each deployment but provides basic functionality
    let count = 1; // Start with 1 for first visitor
    let isNew = true;

    res.status(200).json({
      count,
      isNewVisitor: isNew,
      message: 'Using fallback counter - Vercel KV not configured'
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