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

function limparTexto(valor) {
  if (valor === null || valor === undefined) {
    return null;
  }

  return String(valor).trim();
}

function normalizarCodigo(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase();
}

function codigoValido(codigo) {
  return /^[a-z0-9-]{2,50}$/.test(codigo);
}

function montarEmpresa(dados, parcial = false) {
  const empresa = {};

  function adicionar(campo, valor) {
    if (!parcial || valor !== undefined) {
      empresa[campo] = valor;
    }
  }

  adicionar(
    "nome",
    dados.nome !== undefined
      ? limparTexto(dados.nome)
      : undefined
  );

  adicionar(
    "nome_curto",
    dados.nome_curto !== undefined
      ? limparTexto(dados.nome_curto)
      : undefined
  );

  adicionar(
    "codigo",
    dados.codigo !== undefined
      ? normalizarCodigo(dados.codigo)
      : undefined
  );

  adicionar(
    "cnpj",
    dados.cnpj !== undefined
      ? limparTexto(dados.cnpj)
      : undefined
  );

  adicionar(
    "email_contato",
    dados.email_contato !== undefined
      ? limparTexto(dados.email_contato)
      : undefined
  );

  adicionar(
    "telefone",
    dados.telefone !== undefined
      ? limparTexto(dados.telefone)
      : undefined
  );

  adicionar(
    "site",
    dados.site !== undefined
      ? limparTexto(dados.site)
      : undefined
  );

  adicionar(
    "logo_url",
    dados.logo_url !== undefined
      ? limparTexto(dados.logo_url)
      : undefined
  );

  adicionar(
    "cor_principal",
    dados.cor_principal !== undefined
      ? limparTexto(dados.cor_principal)
      : undefined
  );

  adicionar(
    "cor_secundaria",
    dados.cor_secundaria !== undefined
      ? limparTexto(dados.cor_secundaria)
      : undefined
  );

  adicionar(
    "nome_canal",
    dados.nome_canal !== undefined
      ? limparTexto(dados.nome_canal)
      : undefined
  );

  adicionar(
    "mensagem_inicial",
    dados.mensagem_inicial !== undefined
      ? limparTexto(dados.mensagem_inicial)
      : undefined
  );

  adicionar(
    "plano",
    dados.plano !== undefined
      ? limparTexto(dados.plano)
      : undefined
  );

  adicionar(
    "limite_usuarios",
    dados.limite_usuarios !== undefined
      ? Number(dados.limite_usuarios)
      : undefined
  );

  adicionar(
    "limite_denuncias",
    dados.limite_denuncias === "" ||
    dados.limite_denuncias === null
      ? null
      : dados.limite_denuncias !== undefined
        ? Number(dados.limite_denuncias)
        : undefined
  );

  adicionar(
    "data_vencimento",
    dados.data_vencimento === ""
      ? null
      : dados.data_vencimento
  );

  adicionar(
    "permite_anonima",
    dados.permite_anonima !== undefined
      ? Boolean(dados.permite_anonima)
      : undefined
  );

  adicionar(
    "ativo",
    dados.ativo !== undefined
      ? Boolean(dados.ativo)
      : undefined
  );

  adicionar(
    "bloqueada",
    dados.bloqueada !== undefined
      ? Boolean(dados.bloqueada)
      : undefined
  );

  return empresa;
}

async function listarEmpresas(req, res) {
  const parametros = new URLSearchParams();

  parametros.set("select", "*");
  parametros.set("order", "nome.asc");

  const resposta = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/empresas?${parametros.toString()}`,
    {
      method: "GET",
      headers: headersSupabase()
    }
  );

  const dados = await resposta.json();

  if (!resposta.ok) {
    return res.status(500).json({
      erro: "Erro ao consultar empresas.",
      detalhe: dados
    });
  }

  return res.status(200).json(dados);
}

async function criarEmpresa(req, res, sessao) {
  const dados = req.body || {};

  const nome = limparTexto(dados.nome);
  const codigo = normalizarCodigo(dados.codigo);

  if (!nome) {
    return res.status(400).json({
      erro: "Informe o nome da empresa."
    });
  }

  if (!codigoValido(codigo)) {
    return res.status(400).json({
      erro:
        "O código deve possuir de 2 a 50 caracteres e usar apenas letras minúsculas, números e hífen."
    });
  }

  const empresa = montarEmpresa({
    ...dados,
    nome,
    codigo,
    nome_curto:
      dados.nome_curto || nome,
    nome_canal:
      dados.nome_canal || "Canal de Denúncias",
    cor_principal:
      dados.cor_principal || "#0b3b73",
    cor_secundaria:
      dados.cor_secundaria || "#0ea5e9",
    permite_anonima:
      dados.permite_anonima !== false,
    ativo:
      dados.ativo !== false,
    bloqueada:
      dados.bloqueada === true,
    plano:
      dados.plano || "Starter",
    limite_usuarios:
      dados.limite_usuarios || 3
  });

  const resposta = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/empresas`,
    {
      method: "POST",
      headers: {
        ...headersSupabase(),
        Prefer: "return=representation"
      },
      body: JSON.stringify(empresa)
    }
  );

  const retorno = await resposta.json();

  if (!resposta.ok) {
    const mensagem =
      retorno?.code === "23505"
        ? "Já existe uma empresa com esse código."
        : "Erro ao cadastrar empresa.";

    return res.status(400).json({
      erro: mensagem,
      detalhe: retorno
    });
  }

  return res.status(201).json({
    sucesso: true,
    empresa: retorno[0]
  });
}

async function atualizarEmpresa(req, res, sessao) {
  const id = Number(req.body?.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      erro: "ID da empresa inválido."
    });
  }

  const empresa = montarEmpresa(
    req.body || {},
    true
  );

  delete empresa.id;

  if (
    empresa.codigo !== undefined &&
    !codigoValido(empresa.codigo)
  ) {
    return res.status(400).json({
      erro: "Código da empresa inválido."
    });
  }

  if (
    empresa.nome !== undefined &&
    !empresa.nome
  ) {
    return res.status(400).json({
      erro: "O nome da empresa não pode ficar vazio."
    });
  }

  const campos = Object.keys(empresa);

  if (!campos.length) {
    return res.status(400).json({
      erro: "Nenhuma alteração informada."
    });
  }

  const resposta = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/empresas?id=eq.${id}`,
    {
      method: "PATCH",
      headers: {
        ...headersSupabase(),
        Prefer: "return=representation"
      },
      body: JSON.stringify(empresa)
    }
  );

  const retorno = await resposta.json();

  if (!resposta.ok) {
    return res.status(400).json({
      erro: "Erro ao atualizar empresa.",
      detalhe: retorno
    });
  }

  if (!Array.isArray(retorno) || !retorno.length) {
    return res.status(404).json({
      erro: "Empresa não encontrada."
    });
  }

  return res.status(200).json({
    sucesso: true,
    empresa: retorno[0]
  });
}

async function desativarEmpresa(req, res, sessao) {
  const id = Number(req.body?.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      erro: "ID da empresa inválido."
    });
  }

  const resposta = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/empresas?id=eq.${id}`,
    {
      method: "PATCH",
      headers: {
        ...headersSupabase(),
        Prefer: "return=representation"
      },
      body: JSON.stringify({
        ativo: false
      })
    }
  );

  const retorno = await resposta.json();

  if (!resposta.ok) {
    return res.status(500).json({
      erro: "Erro ao desativar empresa.",
      detalhe: retorno
    });
  }

  if (!Array.isArray(retorno) || !retorno.length) {
    return res.status(404).json({
      erro: "Empresa não encontrada."
    });
  }

  return res.status(200).json({
    sucesso: true,
    empresa: retorno[0]
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
      return listarEmpresas(req, res);
    }

    if (req.method === "POST") {
      return criarEmpresa(req, res);
    }

    if (req.method === "PATCH") {
      return atualizarEmpresa(req, res);
    }

    if (req.method === "DELETE") {
      return desativarEmpresa(req, res);
    }

    return res.status(405).json({
      erro: "Método não permitido."
    });

  } catch (erro) {
    console.error("Erro na API de empresas:", erro);

    return res.status(500).json({
      erro: "Erro interno na gestão de empresas."
    });
  }
}
