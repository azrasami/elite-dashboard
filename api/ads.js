export default async function handler(req, res) {
  try {
    const { act, token } = req.query;

    const url = `https://graph.facebook.com/v19.0/${act}/ads?fields=name,creative{object_story_spec},insights.date_preset(lifetime){ctr,cpc,spend,roas}&access_token=${token}`;

    const fbRes = await fetch(url);
    const data = await fbRes.json();

    res.status(200).json(data);

  } catch (err) {
    res.status(500).json({ error: "Server Error", details: err.message });
  }
}
