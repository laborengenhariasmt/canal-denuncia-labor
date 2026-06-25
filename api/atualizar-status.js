export default async function handler(req, res) {
  const cookie = req.headers.cookie || "";

  if (!cookie.includes(`labor_session=${process.env.SESSION_TOKEN}`)) {
    return res.status(401).json({ erro: "Não autorizado" });
  }

  if (req.method !== "PATCH") {
    return res.status(405).json({ erro: "Método não permitido" });
  }

  const { id, status } = req.body || {};

  if (!id || !status) {
    return res.status(400).json({ erro: "ID e status são obrigatórios" });
  }

  const statusPermitidos = [
    "Recebida",
    "Em análise",
    "Em investigação",
    "Concluída",
    "Arquivada"
  ];

  if (!statusPermitidos.includes(status)) {
    return res.status(400).json({ erro: "Status inválido" });
  }

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
        status,
        atualizado_em: new Date().toISOString()
      })
    }
  );

  if (!resposta.ok) {
    const erro = await resposta.text();
    return res.status(resposta.status).json({ erro });
  }

  return res.status(200).json({ sucesso: true });
}
