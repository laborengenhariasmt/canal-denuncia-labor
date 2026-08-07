import {
  criarCookieSessao,
  criarSessao
} from "../lib/session.js";

import {
  registrarLogSistema
} from "../lib/auditoria.js";

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
    if (
      !process.env.SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY ||
      !process.env.SESSION_TOKEN
    ) {
      return res.status(500).json({
        erro: "Configuração interna incompleta."
      });
    }

    const usuario = normalizarTexto(req.body?.usuario);
    const senha = String(req.body?.senha || "");

    if (!usuario || !senha) {
      return res.status(400).json({
        erro: "Informe o usuário e a senha."
      });
    }

    const respostaSupabase = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/rpc/autenticar_usuario`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization:
            `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
          p_usuario: usuario,
          p_senha: senha
        })
      }
    );

    const dados = await respostaSupabase.json();

    if (!respostaSupabase.ok) {
      console.error("Erro Supabase no login:", dados);

      return res.status(500).json({
        erro: "Não foi possível realizar o login."
      });
    }

    const usuarioAutenticado =
      Array.isArray(dados) && dados.length
        ? dados[0]
        : null;

    if (!usuarioAutenticado) {
      await registrarLogSistema({
        req,
        tipoAcao: "login_falhou",
        recurso: "autenticacao",
        descricao:
          `Tentativa de login sem sucesso para o usuário: ${usuario}`,
        sucesso: false
      });
    
      return res.status(401).json({
        erro: "Usuário ou senha inválidos."
      });
    }

    await registrarLogSistema({
      req,
      usuarioId:
        usuarioAutenticado.id,
    
      empresaId:
        usuarioAutenticado.empresa_id,
    
      tipoAcao:
        "login_sucesso",
    
      recurso:
        "autenticacao",
    
      recursoId:
        usuarioAutenticado.id,
    
      descricao:
        `Login realizado por ${usuarioAutenticado.nome}.`,
    
      sucesso: true
    });

    
    const tokenSessao = criarSessao(usuarioAutenticado);

    res.setHeader(
      "Set-Cookie",
      criarCookieSessao(tokenSessao)
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
          usuarioAutenticado.empresa_nome ||
          "Labor Engenharia",
        empresa_codigo:
          usuarioAutenticado.empresa_codigo ||
          "labor"
      }
    });

  } catch (erro) {
    console.error("Erro interno no login:", erro);

    return res.status(500).json({
      erro: "Erro interno ao realizar login."
    });
  }
}
