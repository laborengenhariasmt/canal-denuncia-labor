export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({
        erro: "Método não permitido"
      });
    }

    if (!process.env.SUPABASE_URL) {
      return res.status(500).json({
        erro: "SUPABASE_URL não configurada."
      });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({
        erro: "SUPABASE_SERVICE_ROLE_KEY não configurada."
      });
    }

    const codigo = String(req.query.codigo || "")
      .trim()
      .toLowerCase();

    if (!codigo || !/^[a-z0-9-]+$/.test(codigo)) {
      return res.status(400).json({
        erro: "Código da empresa inválido."
      });
    }

    const resposta = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/empresas` +
      `?codigo=eq.${encodeURIComponent(codigo)}` +
      `&ativo=eq.true` +
      `&select=id,nome,nome_curto,codigo,logo_url,cor_principal,cor_secundaria,nome_canal,mensagem_inicial,permite_anonima` +
      `&limit=1`,
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
        erro: "Erro ao consultar empresa.",
        detalhe
      });
    }

    const registros = await resposta.json();

    if (!Array.isArray(registros) || registros.length === 0) {
      return res.status(404).json({
        erro: "Empresa não encontrada ou canal desativado."
      });
    }

    const empresa = registros[0];

    return res.status(200).json({
      nome: empresa.nome,
      nome_curto: empresa.nome_curto || empresa.nome,
      codigo: empresa.codigo,
      logo_url: empresa.logo_url || null,
      cor_principal: empresa.cor_principal || "#111827",
      cor_secundaria: empresa.cor_secundaria || "#f97316",
      nome_canal: empresa.nome_canal || "Canal de Denúncias",
      mensagem_inicial:
        empresa.mensagem_inicial ||
        "Ambiente seguro e confidencial para registro de ocorrências.",
      permite_anonima: empresa.permite_anonima !== false
    });

  } catch (erro) {
    console.error("Erro em empresa-publica:", erro);

    return res.status(500).json({
      erro: "Erro interno ao carregar empresa.",
      detalhe: erro.message
    });
  }
}
