export default async function handler(req, res) {
  const { adAccount, token } = req.query;

  if (!adAccount || !token) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  const url = `https://graph.facebook.com/v19.0/${adAccount}/ads?fields=name,creative{object_story_spec},insights{ctr,cpc,spend}&access_token=${token}`;

  try {
    const fbRes = await fetch(url);
    const data = await fbRes.json();

    if (!data.data) {
      return res.status(400).json({ error: data.error || "Failed fetching ads" });
    }

    const ads = data.data.map(ad => {
      const insights = ad.insights ? ad.insights[0] : {};

      const ctr = insights.ctr || "0%";
      const cpc = insights.cpc || "0";
      const spend = insights.spend || 0;

      // ROAS NOT PROVIDED BY META → Set default
      const roas = 0;

      const imageUrl =
        ad.creative?.object_story_spec?.link_data?.image_url ||
        "https://via.placeholder.com/80";

      return {
        name: ad.name,
        ctr,
        cpc,
        spend,
        roas,
        status: roas > 1 ? "WIN" : "LOSE",
        imageUrl
      };
    });

    res.status(200).json({ ads });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
}
