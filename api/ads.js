export default async function handler(req, res) {
  const { adAccount, token } = req.query;

  if (!adAccount || !token) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  // First request: get ads + creative IDs
  const url = `https://graph.facebook.com/v19.0/${adAccount}/ads?fields=name,creative{thumbnail_url,object_story_id},insights{ctr,cpc,spend}&access_token=${token}`;

  try {
    const fbRes = await fetch(url);
    const data = await fbRes.json();

    if (!data.data) {
      return res.status(400).json({ error: data.error || "Failed fetching ads" });
    }

    // Process Ads
    const ads = [];

    for (const ad of data.data) {
      const insights = ad.insights ? ad.insights[0] : {};

      const ctr = insights.ctr || "0%";
      const cpc = insights.cpc || "0";
      const spend = insights.spend || 0;
      const roas = 0;

      let imageUrl = null;

      // 1. Try built-in thumbnail
      if (ad.creative?.thumbnail_url) {
        imageUrl = ad.creative.thumbnail_url;
      }

      // 2. Try object_story_id (get post image)
      if (!imageUrl && ad.creative?.object_story_id) {
        const postUrl = `https://graph.facebook.com/v19.0/${ad.creative.object_story_id}?fields=full_picture&access_token=${token}`;
        const postRes = await fetch(postUrl);
        const postData = await postRes.json();

        if (postData.full_picture) {
          imageUrl = postData.full_picture;
        }
      }

      // 3. Default placeholder if no image
      if (!imageUrl) {
        imageUrl = "https://via.placeholder.com/100";
      }

      ads.push({
        name: ad.name,
        ctr,
        cpc,
        spend,
        roas,
        status: roas > 1 ? "WIN" : "LOSE",
        imageUrl
      });
    }

    res.status(200).json({ ads });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
}
