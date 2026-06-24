export default async function handler(req, res) {
  const cookie = req.headers.cookie || "";

  if (!cookie.includes(`labor_session=${process.env.SESSION_TOKEN}`)) {
    return res.status(401).json({ erro: "Não autorizado" });
  }

  if (req.method !== "PATCH") {
    return res.status(405).json({ erro: "Método não permitido" });
  }

  const { id, status } = req.body;

  if (!id || !status) {
    return res.status(400).json({ erro: "ID e status são obrigatórios" });
  }

  try {
    const resposta = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/denuncias?id=eq.${id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "apikey": process.env.SUPABASE_SERVICE_ROLE_KEY,
          "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          "Prefer": "return=minimal"
        },
        body: JSON.stringify({
          status: status,
          atualizado_em: new Date().toISOString()
        })
      }
    );

    if (!resposta.ok) {
      return res.status(resposta.status).json({ erro: "Erro ao atualizar status" });
    }

    return res.status(200).json({ sucesso: true });

  } catch (erro) {
    return res.status(500).json({ erro: "Erro interno ao atualizar status" });
  }
}
