export default async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: "Missing code" });
  }

  // مؤقتًا فقط نعرض الكود
  // لاحقًا سنبدله بـ access_token
  return res.status(200).json({
    message: "Facebook login success",
    code: code
  });
}
