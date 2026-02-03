import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

// ===================== CONFIG =====================
const INF_BASE = "https://mozazor.infinityfreeapp.com/iot";
const API_KEY = "iot123"; // เปลี่ยนได้

// กัน cache + set header
app.use((req, res, next) => {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  next();
});

// ฟังก์ชันยิงไป infinityfree แบบ "ทำตัวเหมือน browser"
async function forwardToInfinity(url, method = "GET", body = null) {
  const response = await fetch(url, {
    method,
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Accept": "*/*",
      "Connection": "close",
      ...(method === "POST"
        ? { "Content-Type": "application/x-www-form-urlencoded" }
        : {})
    },
    body,
    redirect: "manual" // สำคัญ
  });

  const text = await response.text();
  return {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    text
  };
}

// ===================== ROUTES =====================

// เช็คว่า server ทำงาน
app.get("/", (req, res) => {
  res.send("Render Proxy OK");
});

// 0) DEBUG INSERT (เอาไว้ดูว่า InfinityFree ส่ง HTML อะไรกลับมา)
app.get("/debug_insert", async (req, res) => {
  try {
    const url = `${INF_BASE}/insert_data.php`;

    const postBody =
      `key=${encodeURIComponent(API_KEY)}` +
      `&air_temp=30.12` +
      `&air_hum=50.25` +
      `&water_temp=25.80` +
      `&light=1` +
      `&ec=1.20` +
      `&ph=6.50`;

    const result = await forwardToInfinity(url, "POST", postBody);

    return res.status(200).send(
      "=== DEBUG_INSERT ===\n" +
      "STATUS: " + result.status + "\n\n" +
      "HEADERS:\n" + JSON.stringify(result.headers, null, 2) + "\n\n" +
      "BODY(แรก 1200 ตัวอักษร):\n" + result.text.substring(0, 1200)
    );
  } catch (err) {
    return res.status(500).send("DEBUG ERROR: " + err.message);
  }
});

// 1) GET MODE
app.get("/mode", async (req, res) => {
  try {
    const url = `${INF_BASE}/get_mode.php?key=${API_KEY}`;
    const { text } = await forwardToInfinity(url);

    if (text.includes("<html") || text.includes("<!DOCTYPE")) {
      return res.status(502).send("0");
    }

    return res.status(200).send(text.trim() || "0");
  } catch (err) {
    return res.status(500).send("0");
  }
});

// 2) GET DEVICE STATUS
app.get("/device", async (req, res) => {
  try {
    const id = parseInt(req.query.id || "1", 10);
    const url = `${INF_BASE}/get_device_status.php?id=${id}&key=${API_KEY}`;
    const { text } = await forwardToInfinity(url);

    if (text.includes("<html") || text.includes("<!DOCTYPE")) {
      return res.status(502).send("0");
    }

    return res.status(200).send(text.trim() || "0");
  } catch (err) {
    return res.status(500).send("0");
  }
});

// 3) INSERT DATA (ส่งค่า sensor) -> POST ไป InfinityFree
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

    const { text } = await forwardToInfinity(url, "POST", postBody);

    if (text.includes("<html") || text.includes("<!DOCTYPE")) {
      return res.status(502).send("ERROR_HTML");
    }

    return res.status(200).send(text.trim() || "OK");
  } catch (err) {
    return res.status(500).send("ERROR");
  }
});

// ===================== START =====================
app.listen(PORT, () => {
  console.log(`Render Proxy running on port ${PORT}`);
});
