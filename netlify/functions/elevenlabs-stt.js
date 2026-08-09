// netlify/functions/elevenlabs-stt.js
//
// Server-side proxy for ElevenLabs Speech-to-Text.
// Client sends { audio_base64, mime_type }; this builds the multipart/form-data
// request server-side (no dependencies) so ELEVENLABS_API_KEY never touches
// the browser and the client never has to hand-roll multipart encoding.

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  var apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: { message: "ELEVENLABS_API_KEY is not set in Netlify environment variables." } })
    };
  }

  var payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: { message: "Invalid JSON body." } }) };
  }

  if (!payload.audio_base64) {
    return { statusCode: 400, body: JSON.stringify({ error: { message: "No audio provided." } }) };
  }

  var audioBuf;
  try {
    audioBuf = Buffer.from(payload.audio_base64, "base64");
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: { message: "Could not decode audio." } }) };
  }
  if (!audioBuf.length) {
    return { statusCode: 400, body: JSON.stringify({ error: { message: "Empty audio." } }) };
  }

  var mimeType = payload.mime_type || "audio/webm";
  var ext = mimeType.indexOf("ogg") !== -1 ? "ogg"
    : mimeType.indexOf("mp4") !== -1 ? "mp4"
    : mimeType.indexOf("wav") !== -1 ? "wav"
    : "webm";

  var boundary = "----ThunderBoltBoundary" + Math.random().toString(16).slice(2);
  var preamble = Buffer.from(
    "--" + boundary + "\r\n" +
    "Content-Disposition: form-data; name=\"model_id\"\r\n\r\n" +
    "scribe_v1\r\n" +
    "--" + boundary + "\r\n" +
    "Content-Disposition: form-data; name=\"file\"; filename=\"audio." + ext + "\"\r\n" +
    "Content-Type: " + mimeType + "\r\n\r\n"
  );
  var epilogue = Buffer.from("\r\n--" + boundary + "--\r\n");
  var body = Buffer.concat([preamble, audioBuf, epilogue]);

  try {
    var res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "content-type": "multipart/form-data; boundary=" + boundary
      },
      body: body
    });

    var text = await res.text();
    if (!res.ok) {
      return {
        statusCode: res.status,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ error: { message: "ElevenLabs STT error: " + text.slice(0, 500) } })
      };
    }

    var data;
    try { data = JSON.parse(text); } catch (e) { data = {}; }
    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: data.text || "" })
    };
  } catch (e) {
    return { statusCode: 502, body: JSON.stringify({ error: { message: "Upstream request to ElevenLabs failed: " + e.message } }) };
  }
};
