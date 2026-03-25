import { get, set } from '@vercel/edge-config';

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

    // Get current visitor data from Edge Config
    let visitorData = await get('visitor-data');
    let uniqueVisitors = new Set();
    let visitorCount = 0;

    if (visitorData) {
      try {
        uniqueVisitors = new Set(JSON.parse(visitorData.visitors || '[]'));
        visitorCount = visitorData.count || 0;
      } catch (parseError) {
        console.log('Parse error, starting fresh:', parseError);
      }
    }

    const isNew = !uniqueVisitors.has(visitorId);
    
    if (isNew) {
      uniqueVisitors.add(visitorId);
      visitorCount++;
      console.log('New visitor added. Total count:', visitorCount);
    }

    // Save updated data back to Edge Config
    try {
      await set('visitor-data', {
        visitors: JSON.stringify([...uniqueVisitors]),
        count: visitorCount
      });
      console.log('Saved to Edge Config');
    } catch (saveError) {
      console.log('Save failed, using in-memory only:', saveError);
    }

    res.status(200).json({
      count: visitorCount,
      isNewVisitor: isNew,
      message: 'Using Edge Config storage'
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