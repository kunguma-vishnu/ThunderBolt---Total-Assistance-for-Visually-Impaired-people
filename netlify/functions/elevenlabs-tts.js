// netlify/functions/elevenlabs-tts.js
//
// Server-side proxy for ElevenLabs Text-to-Speech.
// ELEVENLABS_API_KEY stays in Netlify's environment variables and is only
// read here — the browser never sees it.

var DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // "Rachel" — a stock ElevenLabs voice
var DEFAULT_MODEL_ID = "eleven_turbo_v2_5";

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

  var text = (payload.text || "").toString().slice(0, 1000).trim();
  if (!text) {
    return { statusCode: 400, body: JSON.stringify({ error: { message: "No text provided." } }) };
  }

  var voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;
  var modelId = process.env.ELEVENLABS_MODEL_ID || DEFAULT_MODEL_ID;

  try {
    var res = await fetch("https://api.elevenlabs.io/v1/text-to-speech/" + voiceId, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "content-type": "application/json",
        "accept": "audio/mpeg"
      },
      body: JSON.stringify({
        text: text,
        model_id: modelId,
        voice_settings: { stability: 0.5, similarity_boost: 0.75 }
      })
    });

    if (!res.ok) {
      var errText = await res.text();
      return {
        statusCode: res.status,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ error: { message: "ElevenLabs TTS error: " + errText.slice(0, 500) } })
      };
    }

    var arrayBuf = await res.arrayBuffer();
    var b64 = Buffer.from(arrayBuf).toString("base64");
    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ audio_base64: b64, mime_type: "audio/mpeg" })
    };
  } catch (e) {
    return { statusCode: 502, body: JSON.stringify({ error: { message: "Upstream request to ElevenLabs failed: " + e.message } }) };
  }
};
