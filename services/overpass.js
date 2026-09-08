const endpoints = [
  process.env.OVERPASS_API_URL,
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass-api.de/api/interpreter'
].filter(Boolean);

const fetchOverpass = async query => {
  const failures = [];
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'User-Agent': 'AhmedabadMetroWebApp/1.0'
        },
        body: new URLSearchParams({ data: query }),
        signal: AbortSignal.timeout(15000)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      failures.push(`${new URL(endpoint).hostname}: ${error.cause?.code || error.message}`);
    }
  }
  throw new Error(`All Overpass services failed (${failures.join('; ')})`);
};

module.exports = { fetchOverpass };
