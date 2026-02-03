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
      "Accept": "text/plain",
      "Connection": "close",
      ...(method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {})
    },
    body,
    redirect: "manual"
  });

  const text = await response.text();
  return { status: response.status, text };
}

// ===================== ROUTES =====================

// เช็คว่า server ทำงาน
app.get("/", (req, res) => {
  res.send("Render Proxy OK");
});

// 1) GET MODE
app.get("/mode", async (req, res) => {
  try {
    const url = `${INF_BASE}/get_mode.php?key=${API_KEY}`;
    const { text } = await forwardToInfinity(url);

    // ถ้าได้ html แปลว่าโดน redirect / block
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

// 3) INSERT DATA (ส่งค่า sensor)  ✅ เปลี่ยนเป็น POST ไป InfinityFree
app.get("/insert", async (req, res) => {
  try {
    // รับค่าจาก ESP32
    const air_temp = req.query.air_temp ?? "";
    const air_hum = req.query.air_hum ?? "";
    const water_temp = req.query.water_temp ?? "";
    const light = req.query.light ?? "";
    const ec = req.query.ec ?? "";
    const ph = req.query.ph ?? "";

    // ส่งต่อไป InfinityFree แบบ POST
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

    // กัน html
    if (text.includes("<html") || text.includes("<!DOCTYPE")) {
        return res.status(502).send("ERROR_HTML:\n" + text.substring(0, 400));
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
