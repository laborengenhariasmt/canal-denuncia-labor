import {
  lerSessao,
  podeAlterar
} from "../lib/session.js";

const STATUS_PERMITIDOS = [
  "Recebida",
  "Em análise",
  "Em investigação",
  "Concluída",
  "Arquivada"
];

export default async function handler(req, res) {
  if (req.method !== "PATCH") {
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

  if (!podeAlterar(sessao)) {
    return res.status(403).json({
      erro: "Seu perfil não permite alterar denúncias."
    });
  }

  try {
    const id = Number(req.body?.id);
    const status = String(req.body?.status || "");

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        erro: "ID da denúncia inválido."
      });
    }

    if (!STATUS_PERMITIDOS.includes(status)) {
      return res.status(400).json({
        erro: "Status inválido."
      });
    }

    const respostaConsulta = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/denuncias` +
      `?id=eq.${id}` +
      `&select=id,empresa_id,status` +
      `&limit=1`,
      {
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization:
            `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    );

    const registros = await respostaConsulta.json();

    if (
      !respostaConsulta.ok ||
      !Array.isArray(registros) ||
      registros.length === 0
    ) {
      return res.status(404).json({
        erro: "Denúncia não encontrada."
      });
    }

    const denuncia = registros[0];

    if (
      sessao.perfil !== "super_admin" &&
      Number(denuncia.empresa_id) !==
        Number(sessao.empresa_id)
    ) {
      return res.status(403).json({
        erro: "Você não pode alterar esta denúncia."
      });
    }

    const respostaAtualizacao = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/denuncias?id=eq.${id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization:
            `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          Prefer: "return=minimal"
        },
        body: JSON.stringify({
          status,
          atualizado_em: new Date().toISOString()
        })
      }
    );

    if (!respostaAtualizacao.ok) {
      const detalhe = await respostaAtualizacao.text();

      return res.status(500).json({
        erro: "Erro ao atualizar status.",
        detalhe
      });
    }

    const respostaHistorico = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/historico_denuncias`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization:
            `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          Prefer: "return=minimal"
        },
        body: JSON.stringify({
          denuncia_id: denuncia.id,
          empresa_id: denuncia.empresa_id,
          usuario_id: sessao.usuario_id,
          tipo_acao: "alteracao_status",
          status_anterior:
            denuncia.status || "Recebida",
          status_novo: status
        })
      }
    );

    if (!respostaHistorico.ok) {
      console.error(
        "Falha ao registrar histórico:",
        await respostaHistorico.text()
      );
    }

    return res.status(200).json({
      sucesso: true
    });

  } catch (erro) {
    console.error("Erro ao atualizar status:", erro);

    return res.status(500).json({
      erro: "Erro interno ao atualizar status."
    });
  }
}
