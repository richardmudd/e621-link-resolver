export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "POST, OPTIONS"
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type"
    );

    return res.status(204).end();
  }

  res.setHeader(
    "Access-Control-Allow-Origin",
    "*"
  );

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "POST required."
    });
  }

  try {
    const { url } = req.body || {};

    if (
      typeof url !== "string" ||
      !url.trim()
    ) {
      return res.status(400).json({
        ok: false,
        error: "URL is required."
      });
    }

    const pageUrl = new URL(
      url.trim()
    );

    if (
      pageUrl.hostname !== "e621.net" &&
      !pageUrl.hostname.endsWith(".e621.net")
    ) {
      return res.status(400).json({
        ok: false,
        error: "URL is not an e621 URL."
      });
    }

    const match =
      pageUrl.pathname.match(
        /\/posts\/(\d+)/i
      );

    const id =
      match?.[1] ||
      pageUrl.searchParams.get("id");

    if (
      !id ||
      !/^\d+$/.test(id)
    ) {
      return res.status(400).json({
        ok: false,
        error:
          "Could not find an e621 post ID."
      });
    }

    if (
      !process.env.E621_USERNAME ||
      !process.env.E621_API_KEY
    ) {
      return res.status(500).json({
        ok: false,
        error:
          "E621 credentials are not configured."
      });
    }

    const apiUrl =
      new URL(
        "https://e621.net/posts.json"
      );

    apiUrl.searchParams.set(
      "login",
      process.env.E621_USERNAME
    );

    apiUrl.searchParams.set(
      "api_key",
      process.env.E621_API_KEY
    );

    apiUrl.searchParams.set(
      "tags",
      `id:${id}`
    );

    apiUrl.searchParams.set(
      "limit",
      "1"
    );

    const response =
      await fetch(
        apiUrl.toString(),
        {
          method: "GET",
          headers: {
            "User-Agent":
              `MultiSiteLinkResolver/1.0 (by ${process.env.E621_USERNAME})`,
            "Accept":
              "application/json"
          }
        }
      );

    const text =
      await response.text();

    if (!response.ok) {
      return res.status(502).json({
        ok: false,
        error:
          `e621 API returned HTTP ${response.status}: ${text.slice(0, 3000)}`
      });
    }

    let data;

    try {
      data =
        JSON.parse(text);
    } catch {
      return res.status(502).json({
        ok: false,
        error:
          "e621 returned invalid JSON.",
        response:
          text.slice(0, 3000)
      });
    }

    if (
      !Array.isArray(data) ||
      data.length === 0
    ) {
      return res.status(404).json({
        ok: false,
        error:
          `e621 returned no post for ID ${id}.`
      });
    }

    const post = data[0];

    return res.status(200).json({
      ok: true,
      site: "e621",
      id: post.id,
      url:
        post.file?.url ||
        null,
      preview:
        post.preview?.url ||
        post.sample?.url ||
        null,
      post_url:
        `https://e621.net/posts/${post.id}`,
      rating:
        post.rating ||
        null,
      tags:
        flattenTags(post.tags),
      raw: post
    });

  } catch (error) {
    return res.status(500).json({
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : String(error)
    });
  }
}


function flattenTags(tags) {
  if (!tags) {
    return [];
  }

  if (Array.isArray(tags)) {
    return tags;
  }

  const result = [];

  for (
    const value of Object.values(tags)
  ) {
    if (Array.isArray(value)) {
      result.push(...value);
    }
  }

  return result;
}
