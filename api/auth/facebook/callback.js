export default async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: "Missing code" });
  }

  try {
    const tokenUrl =
      `https://graph.facebook.com/v19.0/oauth/access_token` +
      `?client_id=${process.env.FB_APP_ID}` +
      `&redirect_uri=${encodeURIComponent("https://eliteadsdashboard.com/api/auth/facebook/callback")}` +
      `&client_secret=${process.env.FB_APP_SECRET}` +
      `&code=${code}`;

    const fbRes = await fetch(tokenUrl);
    const data = await fbRes.json();

    if (data.error) {
      return res.status(400).json(data);
    }

    // هنا عندك access_token الحقيقي
    return res.status(200).json({
      access_token: data.access_token,
      expires_in: data.expires_in
    });

  } catch (err) {
    return res.status(500).json({ error: "OAuth exchange failed" });
  }
}
