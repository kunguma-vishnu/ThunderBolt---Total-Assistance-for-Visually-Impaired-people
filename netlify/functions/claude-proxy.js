// netlify/functions/claude-proxy.js
//
// Server-side proxy for the Claude Messages API.
// The browser never sees ANTHROPIC_API_KEY — it stays in Netlify's
// environment variables (Site settings → Environment variables) and is
// only read here, inside the serverless function.

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: { message: "ANTHROPIC_API_KEY is not set in Netlify environment variables." } })
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: { message: "Invalid JSON body." } }) };
  }

  // Force the model server-side too, so the client can never override it.
  payload.model = "claude-sonnet-4-6";

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(payload)
    });

    const text = await res.text();
    return {
      statusCode: res.status,
      headers: { "content-type": "application/json" },
      body: text
    };
  } catch (e) {
    return {
      statusCode: 502,
      body: JSON.stringify({ error: { message: "Upstream request to Claude API failed: " + e.message } })
    };
  }
};
