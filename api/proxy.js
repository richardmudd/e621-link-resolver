export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        return res.status(204).end();
    }

    let targetUrl = "";
    let username = "";
    let apiKey = "";

    if (req.method === "GET") {
        targetUrl = req.query?.url || "";
        username = req.query?.user || "";
        apiKey = req.query?.key || "";
    }

    if (req.method === "POST") {
        try {
            const body =
                typeof req.body === "string"
                    ? JSON.parse(req.body)
                    : (req.body || {});

            targetUrl = body.url || "";
            username = body.username || "";
            apiKey = body.apiKey || "";
        } catch (error) {
            return res.status(400).json({
                error: "Invalid JSON request body."
            });
        }
    }

    if (!targetUrl) {
        return res.status(400).send("Missing 'url' parameter");
    }

    let url;

    try {
        url = new URL(targetUrl);
    } catch {
        return res.status(400).json({
            error: "Invalid URL."
        });
    }

    if (url.protocol !== "https:") {
        return res.status(400).json({
            error: "Only HTTPS URLs are allowed."
        });
    }

    const hostname = url.hostname.toLowerCase();

    if (
        hostname !== "e621.net" &&
        !hostname.endsWith(".e621.net")
    ) {
        return res.status(403).json({
            error: "Only e621.net URLs are allowed."
        });
    }

    const headers = {
        "User-Agent":
            `e621MobileZipDownloader/1.0 (by ${username || "anonymous"})`,
        "Accept": "*/*"
    };

    /*
     * e621 API authentication.
     */
    if (
        hostname === "e621.net" &&
        url.pathname.startsWith("/posts/") &&
        username &&
        apiKey
    ) {
        const auth = Buffer
            .from(`${username}:${apiKey}`)
            .toString("base64");

        headers.Authorization = `Basic ${auth}`;
    }

    try {
        const response = await fetch(url.toString(), {
            method: "GET",
            headers
        });

        const buffer = await response.arrayBuffer();

        res.status(response.status);

        const contentType =
            response.headers.get("content-type");

        if (contentType) {
            res.setHeader("Content-Type", contentType);
        }

        return res.send(Buffer.from(buffer));

    } catch (error) {
        console.error(error);

        return res.status(502).json({
            error: "Could not connect to e621.",
            details: error.message
        });
    }
}
