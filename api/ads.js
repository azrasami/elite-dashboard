export default async function handler(req, res) {
  const { adAccount, token, targetRoas, minSpend } = req.query;

  if (!adAccount || !token) {
    return res.status(400).json({ error: "Missing adAccount or token" });
  }

  const target = Number(targetRoas ?? 2);
  const min = Number(minSpend ?? 3);

  if (!Number.isFinite(target) || target <= 0) {
    return res.status(400).json({ error: "Invalid targetRoas" });
  }
  if (!Number.isFinite(min) || min < 0) {
    return res.status(400).json({ error: "Invalid minSpend" });
  }

  function decide(spend, roas) {
    if (spend < min) {
      return {
        decision: "TOO_EARLY",
        reason: `Only $${spend.toFixed(2)} spent. Need at least $${min.toFixed(
          2
        )} to judge.`,
      };
    }

    if (roas < target) {
      return {
        decision: "STOP",
        reason: `Spent $${spend.toFixed(2)} with ROAS ${roas.toFixed(
          2
        )}. Target is ${target.toFixed(2)}.`,
      };
    }

    return {
      decision: "KEEP",
      reason: `ROAS ${roas.toFixed(2)} after $${spend.toFixed(
        2
      )}. Above target ${target.toFixed(2)}.`,
    };
  }

  try {
    const url =
      `https://graph.facebook.com/v19.0/${encodeURIComponent(adAccount)}/ads` +
      `?fields=name,insights.date_preset(last_30d){spend,purchase_roas}` +
      `&limit=200` +
      `&access_token=${encodeURIComponent(token)}`;

    const fbRes = await fetch(url);
    const data = await fbRes.json();

    // خطأ توكن/صلاحيات/حساب
    if (!fbRes.ok || data.error) {
      const message = data?.error?.message || "Meta API error";
      return res.status(400).json({ error: message });
    }

    const list = Array.isArray(data.data) ? data.data : [];

    const ads = list.map((ad) => {
      const insights = ad.insights?.data?.[0] || {};
      const spend = Number(insights.spend || 0);

      let roas = 0;
      const pr = insights.purchase_roas;
      if (Array.isArray(pr) && pr[0] && pr[0].value != null) {
        roas = Number(pr[0].value || 0);
      }

      // لو spend = 0 → TOO_EARLY (حتى لو roas موجود/غير موجود)
      const { decision, reason } = decide(
        Number.isFinite(spend) ? spend : 0,
        Number.isFinite(roas) ? roas : 0
      );

      return {
        name: ad.name || "(Unnamed ad)",
        spend: spend,
        roas: roas,
        decision,
        reason,
      };
    });

    return res.status(200).json({ ads });
  } catch (e) {
    return res.status(500).json({ error: "Server error" });
  }
}
