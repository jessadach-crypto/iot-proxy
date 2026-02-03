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

// ===================== FORWARD =====================
// ฟังก์ชันยิงไป infinityfree แบบ "ทำตัวเหมือน browser"
async function forwardToInfinity(url, method = "GET", body = null) {
  const response = await fetch(url, {
    method,
    headers: {
      // ทำตัวเหมือน browser ให้สุด
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept":
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "th-TH,th;q=0.9,en-US;q=0.8,en;q=0.7",
      "Connection": "keep-alive",
      "Referer": INF_BASE + "/",
      ...(method === "POST"
        ? { "Content-Type": "application/x-www-form-urlencoded" }
        : {})
    },
    body,
    redirect: "manual" // สำคัญ: จะได้รู้ว่าโดน redirect ไปไหน
  });

  const text = await response.text();
  const location = response.headers.get("location") || "";
  return { status: response.status, text, location };
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
    const { status, text, location } = await forwardToInfinity(url);

    // ถ้าได้ html แปลว่าโดน redirect / block
    if (text.includes("<html") || text.includes("<!DOCTYPE")) {
      return res.status(502).send(
        "ERROR_HTML\n" +
          `STATUS=${status}\n` +
          `LOCATION=${location}\n` +
          "SNIP=\n" +
          text.substring(0, 800)
      );
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
    const { status, text, location } = await forwardToInfinity(url);

    if (text.includes("<html") || text.includes("<!DOCTYPE")) {
      return res.status(502).send(
        "ERROR_HTML\n" +
          `STATUS=${status}\n` +
          `LOCATION=${location}\n` +
          "SNIP=\n" +
          text.substring(0, 800)
      );
    }

    return res.status(200).send(text.trim() || "0");
  } catch (err) {
    return res.status(500).send("0");
  }
});

// 3) INSERT DATA (ส่งค่า sensor)  ✅ POST ไป InfinityFree
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

    const { status, text, location } = await forwardToInfinity(
      url,
      "POST",
      postBody
    );

    // กัน html
    if (text.includes("<html") || text.includes("<!DOCTYPE")) {
      return res.status(502).send(
        "ERROR_HTML\n" +
          `STATUS=${status}\n` +
          `LOCATION=${location}\n` +
          "SNIP=\n" +
          text.substring(0, 800)
      );
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
