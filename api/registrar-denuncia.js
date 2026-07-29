export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        erro: "Método não permitido"
      });
    }

    if (!process.env.TURNSTILE_SECRET_KEY) {
      return res.status(500).json({
        erro: "TURNSTILE_SECRET_KEY não configurada na Vercel."
      });
    }

    if (!process.env.SUPABASE_URL) {
      return res.status(500).json({
        erro: "SUPABASE_URL não configurada na Vercel."
      });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({
        erro: "SUPABASE_SERVICE_ROLE_KEY não configurada na Vercel."
      });
    }

    const dados = req.body || {};

    const codigoEmpresa = String(dados.empresa_codigo || "")
      .trim()
      .toLowerCase();

    if (!codigoEmpresa) {
      return res.status(400).json({
        erro: "Empresa não informada."
      });
    }

    if (!/^[a-z0-9-]+$/.test(codigoEmpresa)) {
      return res.status(400).json({
        erro: "Código da empresa inválido."
      });
    }

    const token = dados.turnstileToken;

    if (!token) {
      return res.status(400).json({
        erro: "Captcha não informado."
      });
    }

    const verificacao = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          secret: process.env.TURNSTILE_SECRET_KEY,
          response: token
        })
      }
    );

    const resultadoCaptcha = await verificacao.json();

    if (!resultadoCaptcha.success) {
      return res.status(400).json({
        erro: "Captcha inválido.",
        detalhe: resultadoCaptcha
      });
    }

    const respostaEmpresa = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/empresas` +
      `?codigo=eq.${encodeURIComponent(codigoEmpresa)}` +
      `&ativo=eq.true` +
      `&select=id,nome,codigo` +
      `&limit=1`,
      {
        method: "GET",
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    );

    if (!respostaEmpresa.ok) {
      const detalhe = await respostaEmpresa.text();

      return res.status(500).json({
        erro: "Erro ao identificar a empresa.",
        detalhe
      });
    }

    const empresas = await respostaEmpresa.json();

    if (!Array.isArray(empresas) || empresas.length === 0) {
      return res.status(404).json({
        erro: "Empresa não encontrada ou canal desativado."
      });
    }

    const empresa = empresas[0];

    const respostaDenuncia = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/denuncias`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          Prefer: "return=representation"
        },
        body: JSON.stringify({
          empresa_id: empresa.id,
          protocolo: dados.protocolo,
          tipo_denuncia: dados.tipo_denuncia,
          urgencia: dados.urgencia,
          local_ocorrencia: dados.local_ocorrencia,
          setor: dados.setor,
          data_ocorrencia: dados.data_ocorrencia || null,
          denuncia_anonima: dados.denuncia_anonima,
          nome_denunciante: dados.nome_denunciante || null,
          email_denunciante: dados.email_denunciante || null,
          telefone_denunciante: dados.telefone_denunciante || null,
          descricao: dados.descricao,
          pessoas_envolvidas: dados.pessoas_envolvidas || null,
          testemunhas: dados.testemunhas || null,
          status: "Recebida",
          gravidade: "A classificar"
        })
      }
    );

    if (!respostaDenuncia.ok) {
      const detalhe = await respostaDenuncia.text();

      return res.status(500).json({
        erro: "Erro ao gravar no Supabase.",
        detalhe
      });
    }

    const registros = await respostaDenuncia.json();
    const denuncia = registros[0];

    return res.status(200).json({
      sucesso: true,
      protocolo: denuncia?.protocolo || dados.protocolo,
      empresa: empresa.nome,
      empresa_codigo: empresa.codigo
    });

  } catch (erro) {
    console.error("Erro em registrar-denuncia:", erro);

    return res.status(500).json({
      erro: "Erro interno na API.",
      detalhe: erro.message
    });
  }
}
