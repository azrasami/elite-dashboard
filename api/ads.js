export default async function handler(req, res) {
  const { adAccount, token } = req.query;

  if (!adAccount || !token) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  const url = `https://graph.facebook.com/v19.0/${adAccount}/ads?fields=name,creative{thumbnail_url,object_story_id},insights{impressions,clicks,spend}&access_token=${token}`;

  try {
    const fbRes = await fetch(url);
    const data = await fbRes.json();

    if (!data.data) {
      return res.status(200).json({ data: [] });
    }

    const ads = [];

    for (const ad of data.data) {
      const insight = Array.isArray(ad.insights?.data)
        ? ad.insights.data[0] || {}
        : {};

      let imageUrl =
        ad.creative?.thumbnail_url ||
        "https://via.placeholder.com/80?text=Ad";

      // fallback: try post image
      if (ad.creative?.object_story_id) {
        try {
          const postRes = await fetch(
            `https://graph.facebook.com/v19.0/${ad.creative.object_story_id}?fields=full_picture&access_token=${token}`
          );
          const postData = await postRes.json();
          if (postData.full_picture) imageUrl = postData.full_picture;
        } catch {}
      }

      ads.push({
        name: ad.name || "",
        imageUrl,
        impressions: Number(insight.impressions || 0),
        clicks: Number(insight.clicks || 0),
        spend: Number(insight.spend || 0)
      });
    }

    res.status(200).json({ data: ads });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}
