export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ erro: "Método não permitido" });
  }

  const { usuario, senha } = req.body;

  if (
    usuario === process.env.ADMIN_USER &&
    senha === process.env.ADMIN_PASSWORD
  ) {
    res.setHeader(
      "Set-Cookie",
      `labor_session=${process.env.SESSION_TOKEN}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`
    );

    return res.status(200).json({ sucesso: true });
  }

  return res.status(401).json({ erro: "Usuário ou senha inválidos" });
}
