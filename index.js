import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

const INF_BASE = "https://mozazor.infinityfreeapp.com/iot";
const API_KEY = "iot123";

app.use((req, res, next) => {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  next();
});

async function forwardToInfinity(url, method = "GET", body = null) {
  const response = await fetch(url, {
    method,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "*/*",
      "Accept-Language": "th-TH,th;q=0.9,en-US;q=0.8,en;q=0.7",
      "Connection": "keep-alive",
      "Referer": INF_BASE + "/",
      ...(method === "POST"
        ? { "Content-Type": "application/x-www-form-urlencoded" }
        : {})
    },
    body,
    redirect: "manual"
  });

  const text = await response.text();
  const location = response.headers.get("location") || "";
  return { status: response.status, text, location };
}

app.get("/", (req, res) => res.send("Render Proxy OK"));

app.get("/insert", async (req, res) => {
  try {
    const air_temp = req.query.air_temp ?? "";
    const air_hum = req.query.air_hum ?? "";
    const water_temp = req.query.water_temp ?? "";
    const light = req.query.light ?? "";
    const ec = req.query.ec ?? "";
    const ph = req.query.ph ?? "";

    const url = `${INF_BASE}/insert_data.php`;

    const postBody =
      `key=${encodeURIComponent(API_KEY)}` +
      `&air_temp=${encodeURIComponent(air_temp)}` +
      `&air_hum=${encodeURIComponent(air_hum)}` +
      `&water_temp=${encodeURIComponent(water_temp)}` +
      `&light=${encodeURIComponent(light)}` +
      `&ec=${encodeURIComponent(ec)}` +
      `&ph=${encodeURIComponent(ph)}`;

    const { status, text, location } = await forwardToInfinity(url, "POST", postBody);

    if (text.includes("<html") || text.includes("<!DOCTYPE")) {
      return res.status(502).send("ERROR_HTML");
    }

    return res.status(200).send(text.trim() || "OK");
  } catch (err) {
    return res.status(500).send("ERROR");
  }
});

// 🔥 DEBUG ROUTE: ดู HTML ที่ InfinityFree ส่งกลับมา
app.get("/debug_insert", async (req, res) => {
  try {
    const url = `${INF_BASE}/insert_data.php`;
    const postBody = `key=${encodeURIComponent(API_KEY)}&air_temp=25`;

    const { status, text, location } = await forwardToInfinity(url, "POST", postBody);

    return res.status(200).send(
      `STATUS=${status}\nLOCATION=${location}\n\n-----HTML START-----\n${text}\n-----HTML END-----`
    );
  } catch (err) {
    return res.status(500).send("DEBUG_ERROR");
  }
});

app.listen(PORT, () => console.log(`Render Proxy running on port ${PORT}`));
