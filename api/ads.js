export default async function handler(req, res) {
  const { adAccount, token, aov } = req.query;

  if (!adAccount || !token || !aov) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  try {
    const url = `https://graph.facebook.com/v19.0/${adAccount}/ads?fields=name,creative{thumbnail_url},insights{spend,purchases}&access_token=${token}`;
    const fbRes = await fetch(url);
    const data = await fbRes.json();

    if (!data.data) {
      return res.status(200).json({ ads: [] });
    }

    const ads = data.data.map(ad => {
      const insights = ad.insights?.[0] || {};
      const spend = Number(insights.spend || 0);
      const purchases = Number(insights.purchases || 0);
      const revenue = purchases * Number(aov);
      const roas = spend > 0 ? revenue / spend : 0;

      let status = "NO DATA YET";
      if (spend > 0) status = roas >= 1 ? "WIN" : "LOSE";

      return {
        name: ad.name,
        spend: spend.toFixed(2),
        purchases,
        roas: roas.toFixed(2),
        status,
        image: ad.creative?.thumbnail_url || "https://via.placeholder.com/80"
      };
    });

    res.status(200).json({ ads });
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
}
