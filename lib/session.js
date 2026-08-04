import crypto from "node:crypto";

const NOME_COOKIE = "labor_session";
const DURACAO_SESSAO = 8 * 60 * 60 * 1000;

function obterSegredo() {
  const segredo = process.env.SESSION_TOKEN;

  if (!segredo) {
    throw new Error("SESSION_TOKEN não configurado.");
  }

  return segredo;
}

export function criarSessao(usuario) {
  const payload = {
    usuario_id: Number(usuario.id),
    empresa_id:
      usuario.empresa_id === null
        ? null
        : Number(usuario.empresa_id),
    perfil: usuario.perfil,
    expira_em: Date.now() + DURACAO_SESSAO
  };

  const conteudo = Buffer
    .from(JSON.stringify(payload))
    .toString("base64url");

  const assinatura = crypto
    .createHmac("sha256", obterSegredo())
    .update(conteudo)
    .digest("base64url");

  return `${conteudo}.${assinatura}`;
}

export function criarCookieSessao(token) {
  return [
    `${NOME_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    "Max-Age=28800"
  ].join("; ");
}

export function criarCookieLogout() {
  return [
    `${NOME_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    "Max-Age=0"
  ].join("; ");
}

export function lerSessao(req) {
  try {
    const cookies = String(req.headers.cookie || "")
      .split(";")
      .map(item => item.trim());

    const cookieSessao = cookies.find(
      item => item.startsWith(`${NOME_COOKIE}=`)
    );

    if (!cookieSessao) {
      return null;
    }

    const token = decodeURIComponent(
      cookieSessao.substring(NOME_COOKIE.length + 1)
    );

    const [conteudo, assinaturaRecebida] = token.split(".");

    if (!conteudo || !assinaturaRecebida) {
      return null;
    }

    const assinaturaEsperada = crypto
      .createHmac("sha256", obterSegredo())
      .update(conteudo)
      .digest("base64url");

    const bufferRecebido = Buffer.from(assinaturaRecebida);
    const bufferEsperado = Buffer.from(assinaturaEsperada);

    if (bufferRecebido.length !== bufferEsperado.length) {
      return null;
    }

    if (
      !crypto.timingSafeEqual(
        bufferRecebido,
        bufferEsperado
      )
    ) {
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(conteudo, "base64url").toString("utf8")
    );

    if (
      !payload.usuario_id ||
      !payload.perfil ||
      !payload.expira_em ||
      Date.now() > payload.expira_em
    ) {
      return null;
    }

    return payload;

  } catch (erro) {
    console.error("Erro ao validar sessão:", erro);
    return null;
  }
}

export function podeAlterar(sessao) {
  return [
    "super_admin",
    "cliente_admin",
    "gestor"
  ].includes(sessao?.perfil);
}
