export default async function handler(req, res) {
  const { adAccount, token } = req.query;

  if (!adAccount || !token) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  try {
    const url = `https://graph.facebook.com/v19.0/${adAccount}/insights
      ?level=ad
      &date_preset=last_30d
      &fields=ad_name,ad_id,spend,purchase_roas
      &access_token=${token}`.replace(/\s+/g, "");

    const fbRes = await fetch(url);
    const data = await fbRes.json();

    if (!data.data) {
      return res.status(200).json({ ads: [] });
    }

    const ads = data.data.map(ad => {
      const spend = Number(ad.spend || 0);

      const roas =
        ad.purchase_roas && ad.purchase_roas[0]
          ? Number(ad.purchase_roas[0].value)
          : 0;

      let status = "🕒 NO DATA YET";
      if (spend > 0) status = roas >= 1 ? "WIN" : "LOSE";

      return {
        name: ad.ad_name,
        spend: spend.toFixed(2),
        roas: roas.toFixed(2),
        status,
        imageUrl: "https://via.placeholder.com/80"
      };
    });

    res.status(200).json({ ads });
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
}
