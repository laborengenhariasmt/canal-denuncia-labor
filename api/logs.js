import {
  lerSessao
} from "../lib/session.js";

function headersSupabase() {
  return {
    "Content-Type": "application/json",
    apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization:
      `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      erro: "Método não permitido."
    });
  }

  const sessao = lerSessao(req);

  if (!sessao) {
    return res.status(401).json({
      erro: "Não autorizado."
    });
  }

  try {
    const parametros = new URLSearchParams();

    parametros.set(
      "select",
      [
        "id",
        "denuncia_id",
        "empresa_id",
        "usuario_id",
        "tipo_acao",
        "status_anterior",
        "status_novo",
        "observacao",
        "criado_em",
        "usuarios(nome,usuario)",
        "empresas(nome,codigo)",
        "denuncias(protocolo)"
      ].join(",")
    );

    parametros.set(
      "order",
      "criado_em.desc"
    );

    parametros.set(
      "limit",
      "500"
    );

    if (sessao.perfil !== "super_admin") {
      if (!sessao.empresa_id) {
        return res.status(403).json({
          erro: "Usuário sem empresa vinculada."
        });
      }

      parametros.set(
        "empresa_id",
        `eq.${sessao.empresa_id}`
      );
    }

    const resposta = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/historico_denuncias?${parametros.toString()}`,
      {
        method: "GET",
        headers: headersSupabase()
      }
    );

    const dados = await resposta.json();

    if (!resposta.ok) {
      return res.status(500).json({
        erro: "Erro ao consultar histórico.",
        detalhe: dados
      });
    }

    return res.status(200).json(dados);

  } catch (erro) {
    console.error(
      "Erro ao consultar logs:",
      erro
    );

    return res.status(500).json({
      erro: "Erro interno ao consultar logs."
    });
  }
}
