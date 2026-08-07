import {
  lerSessao
} from "../lib/session.js";

import {
  registrarLogSistema
} from "../lib/auditoria.js";

function headersSupabase() {
  return {
    "Content-Type": "application/json",
    apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization:
      `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
  };
}

function validarSuperAdmin(req, res) {
  const sessao = lerSessao(req);

  if (!sessao) {
    res.status(401).json({
      erro: "Não autorizado."
    });

    return null;
  }

  if (sessao.perfil !== "super_admin") {
    res.status(403).json({
      erro: "Acesso exclusivo do administrador geral."
    });

    return null;
  }

  return sessao;
}

async function listarUsuarios(req, res) {
  const parametros = new URLSearchParams();

  parametros.set(
    "select",
    "id,empresa_id,nome,usuario,perfil,ativo,criado_em,atualizado_em,empresas(nome,codigo)"
  );

  parametros.set(
    "order",
    "nome.asc"
  );

  const resposta = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/usuarios?${parametros.toString()}`,
    {
      method: "GET",
      headers: headersSupabase()
    }
  );

  const dados = await resposta.json();

  if (!resposta.ok) {
    return res.status(500).json({
      erro: "Erro ao consultar usuários.",
      detalhe: dados
    });
  }

  return res.status(200).json(dados);
}

async function verificarLimiteUsuarios(empresaId, usuarioId = null) {
  if (!empresaId) {
    return;
  }

  const respostaEmpresa = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/empresas` +
    `?id=eq.${empresaId}` +
    `&select=id,nome,limite_usuarios` +
    `&limit=1`,
    {
      headers: headersSupabase()
    }
  );

  const empresas = await respostaEmpresa.json();

  if (
    !respostaEmpresa.ok ||
    !Array.isArray(empresas) ||
    !empresas.length
  ) {
    throw new Error(
      "Empresa não encontrada."
    );
  }

  const empresa = empresas[0];

  const parametros = new URLSearchParams();

  parametros.set(
    "empresa_id",
    `eq.${empresaId}`
  );

  parametros.set(
    "ativo",
    "eq.true"
  );

  parametros.set(
    "select",
    "id"
  );

  const respostaUsuarios = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/usuarios?${parametros.toString()}`,
    {
      headers: headersSupabase()
    }
  );

  const usuarios = await respostaUsuarios.json();

  if (!respostaUsuarios.ok) {
    throw new Error(
      "Não foi possível verificar o limite de usuários."
    );
  }

  const existentes = usuarios.filter(
    item => Number(item.id) !== Number(usuarioId)
  ).length;

  const limite = Number(
    empresa.limite_usuarios || 3
  );

  if (existentes >= limite) {
    throw new Error(
      `A empresa atingiu o limite de ${limite} usuários ativos do plano atual.`
    );
  }
}

async function salvarUsuario(
  req,
  res,
  sessao
) {
  const dados = req.body || {};

  const id =
    dados.id
      ? Number(dados.id)
      : null;

  const empresaId =
    dados.empresa_id
      ? Number(dados.empresa_id)
      : null;

  const nome = String(
    dados.nome || ""
  ).trim();

  const usuario = String(
    dados.usuario || ""
  )
    .trim()
    .toLowerCase();

  const senha = String(
    dados.senha || ""
  );

  const perfil = String(
    dados.perfil || ""
  );

  const ativo =
    dados.ativo !== false;

  if (!nome) {
    return res.status(400).json({
      erro: "Informe o nome."
    });
  }

  if (!usuario) {
    return res.status(400).json({
      erro: "Informe o usuário."
    });
  }

  if (
    ![
      "super_admin",
      "cliente_admin",
      "gestor",
      "leitura"
    ].includes(perfil)
  ) {
    return res.status(400).json({
      erro: "Perfil inválido."
    });
  }

  if (
    perfil !== "super_admin" &&
    !empresaId
  ) {
    return res.status(400).json({
      erro: "Selecione a empresa."
    });
  }

  if (!id && !senha) {
    return res.status(400).json({
      erro: "Informe uma senha para o novo usuário."
    });
  }

  if (
    ativo &&
    perfil !== "super_admin"
  ) {
    await verificarLimiteUsuarios(
      empresaId,
      id
    );
  }

  const resposta = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/rpc/salvar_usuario_admin`,
    {
      method: "POST",
      headers: headersSupabase(),
      body: JSON.stringify({
        p_id: id,
        p_empresa_id: empresaId,
        p_nome: nome,
        p_usuario: usuario,
        p_senha: senha || null,
        p_perfil: perfil,
        p_ativo: ativo
      })
    }
  );

  const retorno = await resposta.json();

  if (!resposta.ok) {
    let mensagem =
      "Erro ao salvar usuário.";

    const texto =
      JSON.stringify(retorno);

    if (
      texto.includes(
        "usuarios_usuario_key"
      ) ||
      texto.includes(
        "duplicate key"
      )
    ) {
      mensagem =
        "Já existe um usuário com esse login.";
    }

    return res.status(400).json({
      erro: mensagem,
      detalhe: retorno
    });
  }

  return res.status(
    id ? 200 : 201
  ).json({
    sucesso: true,
    usuario: retorno[0]
  });
}

export default async function handler(req, res) {
  try {
    if (
      !process.env.SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      return res.status(500).json({
        erro: "Configuração interna incompleta."
      });
    }

    const sessao =
      validarSuperAdmin(req, res);

    if (!sessao) {
      return;
    }

    if (req.method === "GET") {
      return listarUsuarios(
        req,
        res
      );
    }

    if (
      req.method === "POST" ||
      req.method === "PATCH"
    ) {
      return salvarUsuario(
        req,
        res,
        sessao
      );
    }

    return res.status(405).json({
      erro: "Método não permitido."
    });

  } catch (erro) {
    console.error(
      "Erro na API de usuários:",
      erro
    );

    return res.status(500).json({
      erro:
        erro.message ||
        "Erro interno na gestão de usuários."
    });
  }
}
