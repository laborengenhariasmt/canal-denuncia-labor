function normalizarTexto(valor) {
  return String(valor || "").trim();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      erro: "Método não permitido."
    });
  }

  try {
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

    if (!process.env.SESSION_TOKEN) {
      return res.status(500).json({
        erro: "SESSION_TOKEN não configurado."
      });
    }

    const usuario = normalizarTexto(req.body?.usuario);
    const senha = String(req.body?.senha || "");

    if (!usuario || !senha) {
      return res.status(400).json({
        erro: "Informe o usuário e a senha."
      });
    }

    if (usuario.length > 100 || senha.length > 200) {
      return res.status(400).json({
        erro: "Dados de acesso inválidos."
      });
    }

    const respostaSupabase = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/rpc/autenticar_usuario`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
          p_usuario: usuario,
          p_senha: senha
        })
      }
    );

    const dados = await respostaSupabase.json();

    if (!respostaSupabase.ok) {
      console.error("Erro ao autenticar no Supabase:", dados);

      return res.status(500).json({
        erro: "Não foi possível realizar o login."
      });
    }

    const usuarioAutenticado =
      Array.isArray(dados) && dados.length > 0
        ? dados[0]
        : null;

    if (!usuarioAutenticado) {
      return res.status(401).json({
        erro: "Usuário ou senha inválidos."
      });
    }

    res.setHeader(
      "Set-Cookie",
      [
        `labor_session=${encodeURIComponent(process.env.SESSION_TOKEN)}`,
        "Path=/",
        "HttpOnly",
        "Secure",
        "SameSite=Strict",
        "Max-Age=28800"
      ].join("; ")
    );

    return res.status(200).json({
      sucesso: true,
      usuario: {
        id: usuarioAutenticado.id,
        nome: usuarioAutenticado.nome,
        usuario: usuarioAutenticado.usuario,
        perfil: usuarioAutenticado.perfil,
        empresa_id: usuarioAutenticado.empresa_id,
        empresa_nome:
          usuarioAutenticado.empresa_nome || "Labor Engenharia",
        empresa_codigo:
          usuarioAutenticado.empresa_codigo || "labor"
      }
    });

  } catch (erro) {
    console.error("Erro interno no login:", erro);

    return res.status(500).json({
      erro: "Erro interno ao realizar login."
    });
  }
}
