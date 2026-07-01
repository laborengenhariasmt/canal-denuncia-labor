export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ erro: "Método não permitido" });
    }

    if (!process.env.TURNSTILE_SECRET_KEY) {
      return res.status(500).json({ erro: "TURNSTILE_SECRET_KEY não configurada na Vercel." });
    }

    if (!process.env.SUPABASE_URL) {
      return res.status(500).json({ erro: "SUPABASE_URL não configurada na Vercel." });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ erro: "SUPABASE_SERVICE_ROLE_KEY não configurada na Vercel." });
    }

    const dados = req.body;

    if (!dados) {
      return res.status(400).json({ erro: "Dados não enviados." });
    }

    const token = dados.turnstileToken;

    if (!token) {
      return res.status(400).json({ erro: "Captcha não informado." });
    }

    const verificacao = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        secret: process.env.TURNSTILE_SECRET_KEY,
        response: token
      })
    });

    const resultado = await verificacao.json();

    if (!resultado.success) {
      return res.status(400).json({
        erro: "Captcha inválido.",
        detalhe: resultado
      });
    }

    const resposta = await fetch(`${process.env.SUPABASE_URL}/rest/v1/denuncias`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": process.env.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Prefer": "return=minimal"
      },
      body: JSON.stringify({
        protocolo: dados.protocolo,
        tipo_denuncia: dados.tipo_denuncia,
        urgencia: dados.urgencia,
        local_ocorrencia: dados.local_ocorrencia,
        setor: dados.setor,
        data_ocorrencia: dados.data_ocorrencia,
        denuncia_anonima: dados.denuncia_anonima,
        nome_denunciante: dados.nome_denunciante,
        email_denunciante: dados.email_denunciante,
        telefone_denunciante: dados.telefone_denunciante,
        descricao: dados.descricao,
        pessoas_envolvidas: dados.pessoas_envolvidas,
        testemunhas: dados.testemunhas,
        status: "Recebida",
        gravidade: "A classificar"
      })
    });

    if (!resposta.ok) {
      const erroSupabase = await resposta.text();
      return res.status(500).json({
        erro: "Erro ao gravar no Supabase.",
        detalhe: erroSupabase
      });
    }

    return res.status(200).json({
      sucesso: true
    });

  } catch (erro) {
    return res.status(500).json({
      erro: "Erro interno na API.",
      detalhe: erro.message
    });
  }
}
