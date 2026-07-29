export default async function handler(req, res) {
  const cookie = req.headers.cookie || "";

  if (!cookie.includes(`labor_session=${process.env.SESSION_TOKEN}`)) {
    return res.status(401).json({
      erro: "Não autorizado"
    });
  }

  if (req.method !== "PATCH") {
    return res.status(405).json({
      erro: "Método não permitido"
    });
  }

  try {
    const { id, acao_tomada } = req.body || {};

    if (!id) {
      return res.status(400).json({
        erro: "ID da denúncia não informado"
      });
    }

    if (typeof acao_tomada !== "string") {
      return res.status(400).json({
        erro: "A ação tomada é inválida"
      });
    }

    const resposta = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/denuncias?id=eq.${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          Prefer: "return=minimal"
        },
        body: JSON.stringify({
          acao_tomada: acao_tomada.trim(),
          atualizado_em: new Date().toISOString()
        })
      }
    );

    if (!resposta.ok) {
      const detalhe = await resposta.text();

      return res.status(500).json({
        erro: "Erro ao salvar a ação tomada",
        detalhe
      });
    }

    return res.status(200).json({
      sucesso: true
    });
  } catch (erro) {
    return res.status(500).json({
      erro: "Erro interno ao salvar a ação",
      detalhe: erro.message
    });
  }
}
