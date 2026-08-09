function setCors(res) {
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
    "Content-Type, Accept"
  );

  res.setHeader(
    "Access-Control-Max-Age",
    "86400"
  );
}


module.exports = async function handler(req, res) {

  setCors(res);


  // Handle browser preflight
  if (req.method === "OPTIONS") {
    return res.status(200).json({
      ok: true
    });
  }


  // =====================================
  // GET TEST
  //
  // /api/e621?test=1
  // =====================================

  if (
    req.method === "GET" &&
    req.query.test === "1"
  ) {

    try {

      const response = await fetch(
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
          text.slice(0, 3000)

      });


    } catch (error) {

      return res.status(500).json({

        ok:false,

        error:
          error.message

      });

    }
  }



  // =====================================
  // GET ID TEST
  //
  // /api/e621?id=6610214
  // =====================================

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

        ok:true,

        result

      });


    } catch(error) {

      return res.status(500).json({

        ok:false,

        error:
          error.message

      });

    }
  }



  // =====================================
  // POST LOOKUP
  // =====================================

  if (req.method !== "POST") {

    return res.status(405).json({

      ok:false,

      error:
        "POST required."

    });

  }



  try {

    // Manually parse body if Vercel
    // did not parse it automatically

    let body =
      req.body;


    if (!body) {

      let raw = "";


      await new Promise((resolve) => {

        req.on(
          "data",
          chunk => {
            raw += chunk;
          }
        );


        req.on(
          "end",
          resolve
        );

      });


      try {

        body =
          JSON.parse(raw);

      } catch {

        body = {};

      }

    }



    const {
      url
    } = body || {};



    if (!url) {

      return res.status(400).json({

        ok:false,

        error:
          "No URL received.",

        bodyReceived:
          body

      });

    }



    const parsed =
      new URL(
        url
      );


    if (
      !parsed.hostname.endsWith(
        "e621.net"
      )
    ) {

      return res.status(400).json({

        ok:false,

        error:
          "Not an e621 URL."

      });

    }



    const match =
      parsed.pathname.match(
        /\/posts\/(\d+)/i
      );



    if (!match) {

      return res.status(400).json({

        ok:false,

        error:
          "Could not find e621 post ID."

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

        ok:false,

        error:
          "No post found."

      });

    }



    return res.status(200).json({

      ok:true,

      site:
        "e621",

      id:
        post.id,

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



  } catch(error) {

    return res.status(500).json({

      ok:false,

      error:
        error.message

    });

  }

};



// =====================================
// e621 API request
// =====================================

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



// =====================================
// Flatten tag object
// =====================================

function flattenTags(tags) {

  if (!tags) {

    return [];

  }


  if (Array.isArray(tags)) {

    return tags;

  }


  return Object.values(tags).flat();

}
