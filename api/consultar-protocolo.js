export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      erro: "Método não permitido."
    });
  }

  try {
    const protocolo = String(
      req.query.protocolo || ""
    )
      .trim()
      .toUpperCase();

    const empresaCodigo = String(
      req.query.empresa || ""
    )
      .trim()
      .toLowerCase();

    if (!protocolo || !empresaCodigo) {
      return res.status(400).json({
        erro: "Informe a empresa e o número do protocolo."
      });
    }

    if (!/^[a-z0-9-]+$/.test(empresaCodigo)) {
      return res.status(400).json({
        erro: "Código da empresa inválido."
      });
    }

    const formatoValido =
      /^[A-Z0-9]{2,10}-\d{4}-\d{6}$/.test(protocolo);

    if (!formatoValido) {
      return res.status(400).json({
        erro: "Formato de protocolo inválido."
      });
    }

    const respostaEmpresa = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/empresas` +
      `?codigo=eq.${encodeURIComponent(empresaCodigo)}` +
      `&ativo=eq.true` +
      `&select=id` +
      `&limit=1`,
      {
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization:
            `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    );

    const empresas = await respostaEmpresa.json();

    if (
      !respostaEmpresa.ok ||
      !Array.isArray(empresas) ||
      empresas.length === 0
    ) {
      return res.status(404).json({
        erro: "Empresa não encontrada ou canal desativado."
      });
    }

    const empresaId = empresas[0].id;

    const parametros = new URLSearchParams({
      protocolo: `eq.${protocolo}`,
      empresa_id: `eq.${empresaId}`,
      select:
        "protocolo,status,criado_em,atualizado_em",
      limit: "1"
    });

    const respostaDenuncia = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/denuncias?${parametros.toString()}`,
      {
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization:
            `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    );

    const registros = await respostaDenuncia.json();

    if (!respostaDenuncia.ok) {
      return res.status(500).json({
        erro: "Erro ao consultar protocolo."
      });
    }

    if (!Array.isArray(registros) || !registros.length) {
      return res.status(404).json({
        erro: "Protocolo não encontrado."
      });
    }

    const denuncia = registros[0];

    return res.status(200).json({
      protocolo: denuncia.protocolo,
      status: denuncia.status || "Recebida",
      criado_em: denuncia.criado_em,
      atualizado_em: denuncia.atualizado_em
    });

  } catch (erro) {
    console.error("Erro na consulta pública:", erro);

    return res.status(500).json({
      erro: "Erro interno ao consultar protocolo."
    });
  }
}
