export default async function handler(req, res) {

    /*
     * CORS headers.
     *
     * The frontend is normally same-origin, but these also make
     * the endpoint usable from other origins if necessary.
     */
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


    /*
     * Handle browser preflight requests.
     */
    if (req.method === "OPTIONS") {
        return res.status(204).end();
    }


    /*
     * We support POST primarily.
     *
     * GET is retained so that manually opening the endpoint
     * without a URL still gives a useful response.
     */
    let targetUrl;
    let username;
    let apiKey;


    if (req.method === "POST") {

        const body =
            typeof req.body === "string"
                ? JSON.parse(req.body || "{}")
                : (req.body || {});

        targetUrl =
            body.url ||
            body.targetUrl;

        username =
            body.username ||
            "";

        apiKey =
            body.apiKey ||
            "";

    } else if (req.method === "GET") {

        targetUrl =
            req.query?.url ||
            "";

        username =
            req.query?.user ||
            "";

        apiKey =
            req.query?.key ||
            "";

    } else {

        return res
            .status(405)
            .json({
                error: "Method not allowed. Use POST."
            });
    }


    /*
     * Require a destination.
     */
    if (!targetUrl) {

        return res
            .status(400)
            .send("Missing 'url' parameter");
    }


    /*
     * Validate URL.
     */
    let parsedUrl;

    try {

        parsedUrl =
            new URL(targetUrl);

    } catch {

        return res
            .status(400)
            .json({
                error: "Invalid target URL."
            });
    }


    /*
     * Only allow HTTPS.
     */
    if (parsedUrl.protocol !== "https:") {

        return res
            .status(400)
            .json({
                error: "Only HTTPS URLs are allowed."
            });
    }


    /*
     * Security restriction:
     *
     * Only e621.net and its subdomains can be proxied.
     *
     * Examples:
     *
     * e621.net
     * static1.e621.net
     * static2.e621.net
     */
    const hostname =
        parsedUrl.hostname.toLowerCase();

    const allowedHost =
        hostname === "e621.net" ||
        hostname.endsWith(".e621.net");


    if (!allowedHost) {

        return res
            .status(403)
            .json({
                error:
                    "This proxy only allows e621.net URLs."
            });
    }


    /*
     * e621 requires a descriptive User-Agent.
     */
    const userAgentName =
        username || "anonymous";


    const headers = {

        "User-Agent":
            `e621MobileZipDownloader/1.0 (by ${userAgentName})`,

        "Accept":
            "*/*"
    };


    /*
     * For authenticated API requests, use HTTP Basic
     * authentication.
     *
     * Do NOT put the API key into the target URL.
     */
    const isApiRequest =
        hostname === "e621.net" &&
        parsedUrl.pathname.startsWith("/posts/");


    if (
        isApiRequest &&
        username &&
        apiKey
    ) {

        const credentials =
            Buffer.from(
                `${username}:${apiKey}`
            ).toString("base64");

        headers.Authorization =
            `Basic ${credentials}`;
    }


    try {

        const response =
            await fetch(
                parsedUrl.toString(),
                {
                    method: "GET",
                    headers
                }
            );


        /*
         * Copy useful response headers.
         */
        const contentType =
            response.headers.get("content-type");

        if (contentType) {

            res.setHeader(
                "Content-Type",
                contentType
            );
        }


        const contentLength =
            response.headers.get("content-length");

        if (contentLength) {

            res.setHeader(
                "Content-Length",
                contentLength
            );
        }


        /*
         * Read the response body.
         */
        const buffer =
            await response.arrayBuffer();


        /*
         * Send e621's original HTTP status.
         */
        res.status(
            response.status
        );


        return res.send(
            Buffer.from(buffer)
        );

    } catch (error) {

        console.error(
            "e621 proxy error:",
            error
        );


        return res
            .status(502)
            .json({
                error:
                    "The Vercel proxy could not connect to e621.",
                details:
                    error.message
            });
    }
}
