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

    // =====================================================
    // 1. CONSULTAR DENÚNCIA ANTES DA ALTERAÇÃO
    // =====================================================

    const respostaConsulta = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/denuncias` +
      `?id=eq.${id}` +
      `&select=id,empresa_id,status` +
      `&limit=1`,
      {
        method: "GET",
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization:
            `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    );

    const registros = await respostaConsulta.json();

    if (!respostaConsulta.ok) {
      return res.status(500).json({
        erro: "Erro ao consultar denúncia antes da alteração.",
        detalhe: registros
      });
    }

    if (
      !Array.isArray(registros) ||
      registros.length === 0
    ) {
      return res.status(404).json({
        erro: "Denúncia não encontrada."
      });
    }

    const denuncia = registros[0];

    // =====================================================
    // 2. VALIDAR EMPRESA
    // =====================================================

    if (
      sessao.perfil !== "super_admin" &&
      Number(denuncia.empresa_id) !==
        Number(sessao.empresa_id)
    ) {
      return res.status(403).json({
        erro: "Você não pode alterar esta denúncia."
      });
    }

    // =====================================================
    // 3. EVITAR ALTERAÇÃO DESNECESSÁRIA
    // =====================================================

    const statusAnterior =
      denuncia.status || "Recebida";

    if (statusAnterior === status) {
      return res.status(200).json({
        sucesso: true,
        mensagem: "O status informado já é o status atual.",
        denuncia: {
          id: denuncia.id,
          status: statusAnterior
        }
      });
    }

    // =====================================================
    // 4. ATUALIZAR STATUS
    // =====================================================

    const respostaAtualizacao = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/denuncias?id=eq.${id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization:
            `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          Prefer: "return=representation"
        },
        body: JSON.stringify({
          status,
          atualizado_em: new Date().toISOString()
        })
      }
    );

    const resultadoAtualizacao =
      await respostaAtualizacao.json();

    if (!respostaAtualizacao.ok) {
      return res.status(500).json({
        erro: "Erro ao atualizar status.",
        detalhe: resultadoAtualizacao
      });
    }

    if (
      !Array.isArray(resultadoAtualizacao) ||
      resultadoAtualizacao.length === 0
    ) {
      return res.status(500).json({
        erro:
          "O Supabase respondeu à alteração, mas nenhum registro foi atualizado."
      });
    }

    const denunciaAtualizada =
      resultadoAtualizacao[0];

    // =====================================================
    // 5. CONFIRMAR QUE O STATUS REALMENTE FOI ALTERADO
    // =====================================================

    if (denunciaAtualizada.status !== status) {
      return res.status(500).json({
        erro:
          "A denúncia foi encontrada, mas o status retornado pelo banco não corresponde ao status solicitado.",
        solicitado: status,
        retornado: denunciaAtualizada.status,
        denuncia: denunciaAtualizada
      });
    }

    console.log(
      "Status atualizado com sucesso:",
      {
        id,
        anterior: statusAnterior,
        novo: denunciaAtualizada.status,
        empresa_id: denunciaAtualizada.empresa_id,
        usuario_id: sessao.usuario_id
      }
    );

    // =====================================================
    // 6. REGISTRAR HISTÓRICO
    // =====================================================

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
          status_anterior: statusAnterior,
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

    // =====================================================
    // 7. RESPOSTA
    // =====================================================

    return res.status(200).json({
      sucesso: true,
      denuncia: {
        id: denunciaAtualizada.id,
        status: denunciaAtualizada.status,
        atualizado_em:
          denunciaAtualizada.atualizado_em
      }
    });

  } catch (erro) {
    console.error(
      "Erro interno ao atualizar status:",
      erro
    );

    return res.status(500).json({
      erro: "Erro interno ao atualizar status.",
      detalhe: erro.message
    });
  }
}
