export default async function handler(req, res) {
  const { adAccount, token, aov } = req.query;

  if (!adAccount || !token || !aov) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  try {
    const url = `https://graph.facebook.com/v19.0/${adAccount}/ads?fields=name,insights{spend,purchase_roas}&access_token=${token}`;
    const fbRes = await fetch(url);
    const data = await fbRes.json();

    if (!data.data) {
      return res.status(200).json({ ads: [] });
    }

    const ads = data.data.map(ad => {
      const insights = ad.insights?.[0] || {};
      const spend = Number(insights.spend || 0);

      let roas = 0;
      if (insights.purchase_roas && insights.purchase_roas[0]) {
        roas = Number(insights.purchase_roas[0].value || 0);
      }

      let status = "🕒 NO DATA YET";
      if (spend > 0) {
        status = roas >= 2 ? "WIN" : "LOSE";
      }

      return {
        name: ad.name,
        spend: spend.toFixed(2),
        roas: roas.toFixed(2),
        status
      };
    });

    res.status(200).json({ ads });
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
}
