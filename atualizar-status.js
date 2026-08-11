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
    const status = String(req.body?.status || "").trim();

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

    /*
     * 1. CONSULTA A DENÚNCIA
     */
    const parametrosConsulta = new URLSearchParams();

    parametrosConsulta.set("id", `eq.${id}`);
    parametrosConsulta.set(
      "select",
      "id,empresa_id,status,protocolo"
    );
    parametrosConsulta.set("limit", "1");

    const respostaConsulta = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/denuncias?${parametrosConsulta.toString()}`,
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
      console.error(
        "Erro ao consultar denúncia:",
        registros
      );

      return res.status(500).json({
        erro: "Erro ao consultar a denúncia."
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

    /*
     * 2. CONFERE SE O USUÁRIO PODE ALTERAR
     * ESTA EMPRESA
     */
    if (
      sessao.perfil !== "super_admin" &&
      Number(denuncia.empresa_id) !==
        Number(sessao.empresa_id)
    ) {
      return res.status(403).json({
        erro: "Você não pode alterar esta denúncia."
      });
    }

    const statusAnterior =
      denuncia.status || "Recebida";

    /*
     * Se já estiver com o mesmo status,
     * não precisamos fazer outra alteração.
     */
    if (statusAnterior === status) {
      return res.status(200).json({
        sucesso: true,
        mensagem: "A denúncia já possui este status.",
        status
      });
    }

    /*
     * 3. ATUALIZA O STATUS
     *
     * IMPORTANTE:
     * return=representation faz o Supabase
     * devolver o registro depois da alteração.
     */
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
          status: status,
          atualizado_em: new Date().toISOString()
        })
      }
    );

    const textoAtualizacao =
      await respostaAtualizacao.text();

    if (!respostaAtualizacao.ok) {
      console.error(
        "Erro Supabase ao atualizar status:",
        textoAtualizacao
      );

      return res.status(500).json({
        erro: "Erro ao atualizar status.",
        detalhe: textoAtualizacao
      });
    }

    let registrosAtualizados = [];

    try {
      registrosAtualizados =
        textoAtualizacao
          ? JSON.parse(textoAtualizacao)
          : [];
    } catch (erro) {
      console.error(
        "Resposta inválida do Supabase:",
        textoAtualizacao
      );
    }

    /*
     * 4. CONFERE SE REALMENTE ALTEROU
     */
    if (
      !Array.isArray(registrosAtualizados) ||
      registrosAtualizados.length === 0
    ) {
      return res.status(500).json({
        erro:
          "O Supabase não confirmou a alteração do status."
      });
    }

    const denunciaAtualizada =
      registrosAtualizados[0];

    if (denunciaAtualizada.status !== status) {
      return res.status(500).json({
        erro:
          "O status retornado pelo banco é diferente do solicitado.",
        status_solicitado: status,
        status_retornado:
          denunciaAtualizada.status
      });
    }

    /*
     * 5. REGISTRA NO HISTÓRICO
     */
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
      const erroHistorico =
        await respostaHistorico.text();

      console.error(
        "Status alterado, mas houve falha no histórico:",
        erroHistorico
      );
    }

    /*
     * 6. DEVOLVE O STATUS CONFIRMADO
     */
    return res.status(200).json({
      sucesso: true,
      mensagem: "Status atualizado com sucesso.",
      id: denunciaAtualizada.id,
      protocolo: denunciaAtualizada.protocolo,
      status_anterior: statusAnterior,
      status_novo: denunciaAtualizada.status
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
