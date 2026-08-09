export default async function handler(req, res) {

  // ==============================
  // CORS
  // ==============================

  res.setHeader(
    "Access-Control-Allow-Origin",
    "*"
  );

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );


  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }


  // ==============================
  // BASIC E621 CONNECTION TEST
  //
  // /api/e621?test=1
  // ==============================

  if (
    req.method === "GET" &&
    req.query.test === "1"
  ) {

    try {

      const response =
        await fetch(
          "https://e621.net/posts.json?limit=1",
          {
            headers: {
              "User-Agent":
                `MultiSiteLinkResolver/1.0 (by ${process.env.E621_USERNAME || "unknown"})`,
              "Accept":
                "application/json"
            }
          }
        );


      const text =
        await response.text();


      return res.status(200).json({

        ok:
          response.ok,

        status:
          response.status,

        contentType:
          response.headers.get(
            "content-type"
          ),

        body:
          text.slice(0,3000)

      });


    } catch(error) {

      return res.status(500).json({

        ok:false,

        error:
          error.message

      });

    }
  }



  // ==============================
  // AUTHENTICATED GET TEST
  //
  // /api/e621?id=POST_ID
  // ==============================

  if (
    req.method === "GET" &&
    req.query.id
  ) {

    try {

      const id =
        req.query.id;


      const data =
        await getE621Post(id);


      return res.status(200).json({

        ok:true,

        result:data

      });


    } catch(error) {

      return res.status(500).json({

        ok:false,

        error:
          error.message

      });

    }

  }



  // ==============================
  // NORMAL POST LOOKUP
  //
  // Body:
  // {
  //   "url":"https://e621.net/posts/123"
  // }
  // ==============================


  if (req.method !== "POST") {

    return res.status(405).json({

      ok:false,

      error:
        "POST required."

    });

  }


  try {

    const {
      url
    } = req.body || {};


    if (
      typeof url !== "string" ||
      !url.trim()
    ) {

      return res.status(400).json({

        ok:false,

        error:
          "URL is required."

      });

    }


    const parsed =
      new URL(
        url.trim()
      );


    const match =
      parsed.pathname.match(
        /\/posts\/(\d+)/i
      );


    const id =
      match?.[1];


    if (!id) {

      return res.status(400).json({

        ok:false,

        error:
          "Could not find post ID."

      });

    }


    const result =
      await getE621Post(id);


    const post =
      result.posts?.[0];


    if (!post) {

      return res.status(404).json({

        ok:false,

        error:
          "No e621 post found."

      });

    }


    return res.status(200).json({

      ok:true,

      site:"e621",

      id:
        post.id,

      url:
        post.file?.url || null,

      preview:
        post.preview?.url ||
        post.sample?.url ||
        null,

      post_url:
        `https://e621.net/posts/${post.id}`,

      rating:
        post.rating,

      tags:
        flattenTags(post.tags),

      raw:
        post

    });


  } catch(error) {

    return res.status(500).json({

      ok:false,

      error:
        error.message

    });

  }

}



// ==============================
// E621 API REQUEST
// ==============================

async function getE621Post(id) {


  if (
    !process.env.E621_USERNAME ||
    !process.env.E621_API_KEY
  ) {

    throw new Error(
      "Missing E621_USERNAME or E621_API_KEY."
    );

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
      `e621 API returned HTTP ${response.status}: ${text.slice(0,1000)}`
    );

  }


  return JSON.parse(text);

}



// ==============================
// TAG FORMATTER
// ==============================

function flattenTags(tags) {

  if (!tags) {
    return [];
  }


  if (Array.isArray(tags)) {
    return tags;
  }


  return Object.values(tags)
    .flat();

}
