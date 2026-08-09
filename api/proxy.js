export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") return res.status(200).end();

  const targetUrl = req.query.url;
  const username = req.query.user;
  const apiKey = req.query.key;

  if (!targetUrl) return res.status(400).send("Missing 'url' parameter");

  const headers = {
    "User-Agent": `e621MobileZipDownloader/1.0 (by ${username || "anonymous"} on e621)`
  };

  let fetchUrl = targetUrl;
  if (!targetUrl.includes("static") && username && apiKey) {
    const parsed = new URL(targetUrl);
    parsed.searchParams.set("login", username);
    parsed.searchParams.set("api_key", apiKey);
    fetchUrl = parsed.toString();
  }

  try {
    const response = await fetch(fetchUrl, { headers });
    const buffer = await response.arrayBuffer();

    res.status(response.status);
    res.send(Buffer.from(buffer));
  } catch (err) {
    res.status(500).send(`Vercel Proxy Error: ${err.message}`);
  }
}
