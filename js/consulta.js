let empresaAtual = null;

function obterEmpresaCodigo() {
  const parametros = new URLSearchParams(
    window.location.search
  );

  return String(parametros.get("empresa") || "")
    .trim()
    .toLowerCase();
}

function mostrarPagina(id) {
  const paginas = [
    "paginaCarregando",
    "paginaErro",
    "paginaConsulta"
  ];

  paginas.forEach((paginaId) => {
    const elemento = document.getElementById(paginaId);

    if (elemento) {
      elemento.style.display =
        paginaId === id ? "block" : "none";
    }
  });
}

function escaparHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function aplicarTemaEmpresa(empresa) {
  document.title =
    `Consultar Protocolo | ${empresa.nome_curto}`;

  const cabecalho =
    document.getElementById("cabecalhoEmpresa");

  if (cabecalho) {
    cabecalho.style.background =
      `linear-gradient(135deg, ${empresa.cor_principal}, ${empresa.cor_secundaria})`;
  }

  const titulo =
    document.getElementById("tituloConsulta");

  const subtitulo =
    document.getElementById("subtituloConsulta");

  const logo =
    document.getElementById("logoEmpresa");

  const botao =
    document.getElementById("botaoConsultar");

  const linkVoltar =
    document.getElementById("linkVoltarCanal");

  titulo.textContent =
    `Consultar Protocolo — ${empresa.nome_curto}`;

  subtitulo.textContent =
    `Consulte o andamento do relato registrado no canal da ${empresa.nome_curto}.`;

  botao.style.backgroundColor =
    empresa.cor_secundaria;

  linkVoltar.href =
    `/?empresa=${encodeURIComponent(empresa.codigo)}`;

  if (empresa.logo_url) {
    logo.src = empresa.logo_url;
    logo.alt = empresa.nome;
    logo.style.display = "block";
  } else {
    logo.style.display = "none";
  }
}

async function carregarEmpresa() {
  const codigo = obterEmpresaCodigo();

  if (!codigo) {
    document.getElementById(
      "mensagemErroEmpresa"
    ).textContent =
      "Empresa não identificada no endereço.";

    mostrarPagina("paginaErro");
    return;
  }

  try {
    const resposta = await fetch(
      `/api/empresa-publica?codigo=${encodeURIComponent(codigo)}`
    );

    const dados = await resposta.json();

    if (!resposta.ok) {
      throw new Error(
        dados.erro ||
        "Empresa não encontrada ou canal desativado."
      );
    }

    empresaAtual = dados;

    aplicarTemaEmpresa(empresaAtual);
    mostrarPagina("paginaConsulta");

  } catch (erro) {
    console.error(erro);

    document.getElementById(
      "mensagemErroEmpresa"
    ).textContent = erro.message;

    mostrarPagina("paginaErro");
  }
}

document
  .getElementById("consultaForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    if (!empresaAtual) {
      return;
    }

    const protocolo = document
      .getElementById("protocoloConsulta")
      .value
      .trim()
      .toUpperCase();

    const resultado =
      document.getElementById("resultadoConsulta");

    const botao =
      document.getElementById("botaoConsultar");

    resultado.innerHTML = "";

    botao.disabled = true;
    botao.innerText = "Consultando...";

    try {
      const parametros = new URLSearchParams({
        empresa: empresaAtual.codigo,
        protocolo
      });

      const resposta = await fetch(
        `/api/consultar-protocolo?${parametros.toString()}`
      );

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.erro ||
          "Não foi possível consultar o protocolo."
        );
      }

      const dataRegistro = dados.criado_em
        ? new Date(dados.criado_em)
            .toLocaleString("pt-BR")
        : "Não informada";

      const dataAtualizacao = dados.atualizado_em
        ? new Date(dados.atualizado_em)
            .toLocaleString("pt-BR")
        : "Ainda não houve atualização";

      resultado.innerHTML = `
        <div class="aviso">

          <h3>Protocolo localizado</h3>

          <p>
            <strong>Protocolo:</strong>
            ${escaparHtml(dados.protocolo)}
          </p>

          <p>
            <strong>Status atual:</strong>
            ${escaparHtml(dados.status)}
          </p>

          <p>
            <strong>Registrado em:</strong>
            ${escaparHtml(dataRegistro)}
          </p>

          <p>
            <strong>Última atualização:</strong>
            ${escaparHtml(dataAtualizacao)}
          </p>

          <p>
            Para preservar a confidencialidade, esta consulta
            mostra somente o andamento do relato.
          </p>

        </div>
      `;

    } catch (erro) {
      resultado.innerHTML = `
        <div class="aviso">

          <strong>Não foi possível consultar.</strong>

          <p>
            ${escaparHtml(erro.message)}
          </p>

        </div>
      `;

    } finally {
      botao.disabled = false;
      botao.innerText = "Consultar protocolo";
    }
  });

carregarEmpresa();
