function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Accept"
  );
  res.setHeader(
    "Access-Control-Max-Age",
    "86400"
  );
}


module.exports = async function handler(req, res) {

  setCors(res);


  // Preflight
  if (req.method === "OPTIONS") {
    return res.status(200).json({
      ok: true
    });
  }


  // ===============================
  // GET TEST
  // /api/e621?test=1
  // ===============================

  if (
    req.method === "GET" &&
    req.query.test === "1"
  ) {

    try {

      const data = await e621Fetch(
        "https://e621.net/posts.json?limit=1"
      );

      return res.status(200).json({
        ok: true,
        status: 200,
        body: data
      });

    } catch (error) {

      return res.status(500).json({
        ok: false,
        error: error.message
      });

    }
  }



  // ===============================
  // GET ID TEST
  // /api/e621?id=123
  // ===============================

  if (
    req.method === "GET" &&
    req.query.id
  ) {

    try {

      const result =
        await getE621Post(
          req.query.id
        );


      return res.status(200).json({
        ok: true,
        result
      });


    } catch (error) {

      return res.status(500).json({
        ok: false,
        error: error.message
      });

    }
  }



  // ===============================
  // POST LOOKUP
  // ===============================

  if (req.method !== "POST") {

    return res.status(405).json({
      ok: false,
      error: "POST required."
    });

  }



  try {

    let body = req.body || {};


    if (typeof body === "string") {

      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }

    }


    const url = body.url;


    if (!url) {

      return res.status(400).json({
        ok: false,
        error: "No URL received.",
        bodyReceived: body
      });

    }



    const parsed =
      new URL(url);



    if (
      !parsed.hostname.endsWith("e621.net")
    ) {

      return res.status(400).json({
        ok: false,
        error: "Not an e621 URL."
      });

    }



    const match =
      parsed.pathname.match(
        /\/posts\/(\d+)/i
      );


    if (!match) {

      return res.status(400).json({
        ok: false,
        error: "Could not find e621 post ID."
      });

    }



    const result =
      await getE621Post(
        match[1]
      );


    const post =
      result.posts?.[0];


    if (!post) {

      return res.status(404).json({
        ok: false,
        error: "No post found."
      });

    }



    return res.status(200).json({

      ok: true,

      site: "e621",

      id: post.id,

      url:
        post.file?.url || null,

      preview:
        post.preview?.url ||
        post.sample?.url ||
        null,

      sample:
        post.sample?.url ||
        null,

      post_url:
        `https://e621.net/posts/${post.id}`,

      rating:
        post.rating || null,

      tags:
        flattenTags(post.tags),

      description:
        post.description || "",

      raw:
        post

    });



  } catch (error) {

    return res.status(500).json({
      ok: false,
      error: error.message
    });

  }

};




// ===============================
// e621 authenticated request
// ===============================

async function getE621Post(id) {

  const url =
    new URL(
      "https://e621.net/posts.json"
    );


  url.searchParams.set(
    "login",
    process.env.E621_USERNAME
  );


  url.searchParams.set(
    "api_key",
    process.env.E621_API_KEY
  );


  url.searchParams.set(
    "tags",
    `id:${id}`
  );


  url.searchParams.set(
    "limit",
    "1"
  );


  return await e621Fetch(
    url.toString()
  );

}




// ===============================
// Fetch with timeout
// ===============================

async function e621Fetch(url) {

  const controller =
    new AbortController();


  const timeout =
    setTimeout(
      () => controller.abort(),
      10000
    );


  try {

    const response =
      await fetch(
        url,
        {
          signal:
            controller.signal,

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

      throw new Error(
        `e621 API returned HTTP ${response.status}: ${text.slice(0,500)}`
      );

    }


    return JSON.parse(text);


  } finally {

    clearTimeout(timeout);

  }

}




// ===============================
// Flatten tags
// ===============================

function flattenTags(tags) {

  if (!tags) {
    return [];
  }


  if (Array.isArray(tags)) {
    return tags;
  }


  return Object.values(tags).flat();

}
