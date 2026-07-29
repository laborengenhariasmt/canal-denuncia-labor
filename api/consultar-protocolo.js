export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      erro: "Método não permitido"
    });
  }

  try {
    const protocolo = String(req.query.protocolo || "")
      .trim()
      .toUpperCase();

    if (!protocolo) {
      return res.status(400).json({
        erro: "Informe o número do protocolo"
      });
    }

    const formatoValido = /^LABOR-\d{4}-\d{6}$/.test(protocolo);

    if (!formatoValido) {
      return res.status(400).json({
        erro: "Formato de protocolo inválido"
      });
    }

    const resposta = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/denuncias` +
      `?protocolo=eq.${encodeURIComponent(protocolo)}` +
      `&select=protocolo,status,criado_em,atualizado_em`,
      {
        method: "GET",
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    );

    if (!resposta.ok) {
      const detalhe = await resposta.text();

      return res.status(500).json({
        erro: "Erro ao consultar protocolo",
        detalhe
      });
    }

    const registros = await resposta.json();

    if (!registros.length) {
      return res.status(404).json({
        erro: "Protocolo não encontrado"
      });
    }

    const denuncia = registros[0];

    return res.status(200).json({
      protocolo: denuncia.protocolo,
      status: denuncia.status || "Recebida",
      criado_em: denuncia.criado_em,
      atualizado_em: denuncia.atualizado_em
    });
  } catch (erro) {
    return res.status(500).json({
      erro: "Erro interno ao consultar protocolo",
      detalhe: erro.message
    });
  }
}
