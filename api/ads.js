export default async function handler(req, res) {
  const { account, token } = req.query;

  try {
    const url = `https://graph.facebook.com/v19.0/${account}/ads?fields=name,creative{object_story_spec},insights.time_range({'since':'2024-01-01','until':'2025-12-31'}){ctr,cpc,spend,roas}&access_token=${token}`;

    const fb = await fetch(url);
    const json = await fb.json();

    if (!json.data) {
      return res.status(400).json({ success: false, error: json.error?.message });
    }

    const ads = json.data.map(ad => {
      const insights = ad.insights?.[0] || {};

      return {
        name: ad.name || "N/A",
        image:
          ad.creative?.object_story_spec?.link_data?.image_url ||
          "https://via.placeholder.com/80",
        ctr: insights.ctr || "0",
        cpc: insights.cpc || "0",
        roas: insights.roas?.[0]?.value || 0
      };
    });

    res.status(200).json({ success: true, ads });

  } catch (err) {
    res.status(500).json({ success: false, error: "Server Error" });
  }
}
