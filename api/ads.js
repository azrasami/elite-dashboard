export default async function handler(req, res) {
  const { adAccount, token } = req.query;

  if (!adAccount || !token) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  const url = `https://graph.facebook.com/v19.0/${adAccount}/ads?fields=name,creative{thumbnail_url},insights{impressions,clicks,spend}&access_token=${token}`;

  try {
    const fbRes = await fetch(url);
    const data = await fbRes.json();

    if (!data.data) {
      return res.status(200).json({ data: [] });
    }

    const ads = data.data.map(ad => {
      const insight =
        ad.insights?.data && ad.insights.data.length > 0
          ? ad.insights.data[0]
          : {};

      return {
        name: ad.name || "",
        imageUrl:
          ad.creative?.thumbnail_url ||
          "https://via.placeholder.com/80?text=Ad",
        impressions: Number(insight.impressions || 0),
        clicks: Number(insight.clicks || 0),
        spend: Number(insight.spend || 0)
      };
    });

    res.status(200).json({ data: ads });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}
