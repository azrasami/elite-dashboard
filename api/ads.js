// api/ads.js

// ===============================
// Simple in-memory rate limit
// ===============================
const RATE_LIMIT = 10; // requests per IP per day
const requests = {};

export default async function handler(req, res) {
  const { adAccount, token, targetRoas, minSpend } = req.query;

  // -------------------------------
  // Basic validation
  // -------------------------------
  if (!adAccount || !token) {
    return res.status(400).json({
      error: "Missing adAccount or token",
    });
  }

  const target = Number(targetRoas ?? 2);
  const min = Number(minSpend ?? 3);

  if (!Number.isFinite(target) || target <= 0) {
    return res.status(400).json({ error: "Invalid target ROAS" });
  }

  if (!Number.isFinite(min) || min < 0) {
    return res.status(400).json({ error: "Invalid minimum spend" });
  }

  // -------------------------------
  // Rate limiting (per IP / per day)
  // -------------------------------
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.socket?.remoteAddress ||
    "unknown";

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const key = `${ip}_${today}`;

  requests[key] = (requests[key] || 0) + 1;

  if (requests[key] > RATE_LIMIT) {
    return res.status(429).json({
      error: "Trial limit reached. Contact us to continue.",
    });
  }

  // -------------------------------
  // Decision engine
  // -------------------------------
  function decide(spend, roas) {
    if (spend < min) {
      return {
        decision: "TOO_EARLY",
        reason: `Only $${spend.toFixed(
          2
        )} spent. Need at least $${min.toFixed(2)} to judge.`,
      };
    }

    if (roas < target) {
      return {
        decision: "STOP",
        reason: `Spent $${spend.toFixed(
          2
        )} with ROAS ${roas.toFixed(2)}. Target is ${target.toFixed(2)}.`,
      };
    }

    return {
      decision: "KEEP",
      reason: `ROAS ${roas.toFixed(2)} after $${spend.toFixed(
        2
      )}. Above target ${target.toFixed(2)}.`,
    };
  }

  // -------------------------------
  // Fetch ads from Meta API
  // -------------------------------
  try {
    const url =
      `https://graph.facebook.com/v19.0/${encodeURIComponent(adAccount)}/ads` +
      `?fields=name,effective_status,objective,insights.date_preset(last_30d){spend,purchase_roas}` +
      `&limit=200` +
      `&access_token=${encodeURIComponent(token)}`;

    const fbRes = await fetch(url);
    const data = await fbRes.json();

    if (!fbRes.ok || data.error) {
      return res.status(400).json({
        error: data?.error?.message || "Meta API error",
      });
    }

    const ads = (data.data || []).map((ad) => {
      const name = ad.name || "(Unnamed ad)";

      // ---------------------------
      // 1) Paused ads
      // ---------------------------
      if (ad.effective_status === "PAUSED") {
        return {
          name,
          spend: 0,
          roas: 0,
          decision: "PAUSED",
          reason: "Ad is currently paused. No decision needed.",
        };
      }

      // ---------------------------
      // 2) Non-sales objectives
      // ---------------------------
      const nonSalesObjectives = [
        "ENGAGEMENT",
        "POST_ENGAGEMENT",
        "PAGE_LIKES",
        "MESSAGES",
        "TRAFFIC",
        "VIDEO_VIEWS",
        "REACH",
        "AWARENESS",
      ];

      if (nonSalesObjectives.includes(ad.objective)) {
        return {
          name,
          spend: 0,
          roas: 0,
          decision: "NOT_SALES",
          reason: `Objective is ${ad.objective}. This ad is not meant for ROAS decisions.`,
        };
      }

      // ---------------------------
      // 3) Sales ads → decision
      // ---------------------------
      const insights = ad.insights?.data?.[0] || {};
      const spend = Number(insights.spend || 0);

      let roas = 0;
      const pr = insights.purchase_roas;
      if (Array.isArray(pr) && pr[0] && pr[0].value != null) {
        roas = Number(pr[0].value || 0);
      }

      const { decision, reason } = decide(spend, roas);

      return {
        name,
        spend,
        roas,
        decision,
        reason,
      };
    });

    return res.status(200).json({ ads });
  } catch (err) {
    return res.status(500).json({
      error: "Server error",
    });
  }
}
