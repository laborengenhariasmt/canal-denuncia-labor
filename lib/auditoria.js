export async function registrarLogSistema({
  req,
  usuarioId = null,
  empresaId = null,
  tipoAcao,
  recurso = null,
  recursoId = null,
  descricao = null,
  sucesso = true
}) {
  try {
    if (
      !process.env.SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      console.error(
        "Auditoria não registrada: configuração Supabase ausente."
      );

      return false;
    }

    const forwarded =
      req?.headers?.["x-forwarded-for"];

    const ip =
      typeof forwarded === "string"
        ? forwarded.split(",")[0].trim()
        : req?.socket?.remoteAddress || null;

    const userAgent =
      String(
        req?.headers?.["user-agent"] || ""
      ).slice(0, 1000);

    const resposta = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/logs_sistema`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey:
            process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization:
            `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          Prefer: "return=minimal"
        },

        body: JSON.stringify({
          usuario_id: usuarioId,
          empresa_id: empresaId,
          tipo_acao: tipoAcao,
          recurso,
          recurso_id: recursoId,
          descricao,
          ip,
          user_agent: userAgent,
          sucesso
        })
      }
    );

    if (!resposta.ok) {
      console.error(
        "Falha ao registrar auditoria:",
        await resposta.text()
      );

      return false;
    }

    return true;

  } catch (erro) {
    console.error(
      "Erro ao registrar auditoria:",
      erro
    );

    return false;
  }
}
