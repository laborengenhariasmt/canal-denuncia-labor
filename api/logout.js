export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      erro: "Método não permitido."
    });
  }

  res.setHeader(
    "Set-Cookie",
    [
      "labor_session=",
      "Path=/",
      "HttpOnly",
      "Secure",
      "SameSite=Strict",
      "Max-Age=0"
    ].join("; ")
  );

  return res.status(200).json({
    sucesso: true
  });
}
