let empresaAtual = null;

function obterEmpresaCodigo() {
  const parametros = new URLSearchParams(window.location.search);

  return String(parametros.get("empresa") || "")
    .trim()
    .toLowerCase();
}

function gerarProtocolo() {
  const ano = new Date().getFullYear();
  const numero = Math.floor(100000 + Math.random() * 900000);

  const prefixo = String(empresaAtual?.codigo || "CANAL")
    .replace(/[^a-z0-9]/gi, "")
    .toUpperCase()
    .slice(0, 10);

  return `${prefixo}-${ano}-${numero}`;
}

function mostrarPagina(id) {
  const paginas = [
    "paginaCarregando",
    "paginaNeutra",
    "paginaErro",
    "paginaCanal"
  ];

  paginas.forEach((paginaId) => {
    const elemento = document.getElementById(paginaId);

    if (elemento) {
      elemento.style.display = paginaId === id ? "block" : "none";
    }
  });
}

function aplicarTemaEmpresa(empresa) {
  document.title =
    `${empresa.nome_canal} | ${empresa.nome_curto}`;

  document.documentElement.style.setProperty(
    "--empresa-cor-principal",
    empresa.cor_principal
  );

  document.documentElement.style.setProperty(
    "--empresa-cor-secundaria",
    empresa.cor_secundaria
  );

  const cabecalho = document.getElementById("cabecalhoEmpresa");

  if (cabecalho) {
    cabecalho.style.background =
      `linear-gradient(135deg, ${empresa.cor_principal}, ${empresa.cor_secundaria})`;
  }

  document.querySelectorAll("button").forEach((botao) => {
    botao.style.backgroundColor = empresa.cor_secundaria;
  });

  const nomeCanal = document.getElementById("nomeCanal");
  const mensagemInicial = document.getElementById("mensagemInicial");
  const logoEmpresa = document.getElementById("logoEmpresa");
  const linkConsulta = document.getElementById("linkConsulta");

  nomeCanal.textContent = empresa.nome_canal;
  mensagemInicial.textContent = empresa.mensagem_inicial;

  if (empresa.logo_url) {
    logoEmpresa.src = empresa.logo_url;
    logoEmpresa.alt = empresa.nome;
    logoEmpresa.style.display = "block";
  } else {
    logoEmpresa.style.display = "none";
  }

  linkConsulta.href =
    `/consulta.html?empresa=${encodeURIComponent(empresa.codigo)}`;

  if (!empresa.permite_anonima) {
    const anonimoSim = document.querySelector(
      'input[name="anonimo"][value="sim"]'
    );

    const anonimoNao = document.querySelector(
      'input[name="anonimo"][value="nao"]'
    );

    const blocoIdentificacao =
      document.getElementById("blocoIdentificacao");

    if (anonimoSim) {
      anonimoSim.checked = false;
      anonimoSim.disabled = true;
    }

    if (anonimoNao) {
      anonimoNao.checked = true;
    }

    if (blocoIdentificacao) {
      blocoIdentificacao.style.display = "none";
    }

    document.getElementById("dadosIdentificacao").style.display = "grid";
  }
}

async function carregarEmpresa() {
  const codigo = obterEmpresaCodigo();

  if (!codigo) {
    mostrarPagina("paginaNeutra");
    return;
  }

  try {
    const resposta = await fetch(
      `/api/empresa-publica?codigo=${encodeURIComponent(codigo)}`
    );

    const dados = await resposta.json();

    if (!resposta.ok) {
      throw new Error(
        dados.erro || "Empresa não encontrada ou canal desativado."
      );
    }

    empresaAtual = dados;

    aplicarTemaEmpresa(empresaAtual);
    mostrarPagina("paginaCanal");

  } catch (erro) {
    console.error(erro);

    document.getElementById("mensagemErroEmpresa").textContent =
      erro.message;

    mostrarPagina("paginaErro");
  }
}

document
  .querySelectorAll('input[name="anonimo"]')
  .forEach((radio) => {
    radio.addEventListener("change", () => {
      const selecionado = document.querySelector(
        'input[name="anonimo"]:checked'
      );

      const identificado =
        selecionado && selecionado.value === "nao";

      document.getElementById("dadosIdentificacao").style.display =
        identificado ? "grid" : "none";
    });
  });

document
  .getElementById("denunciaForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    if (!empresaAtual) {
      alert("Empresa não identificada.");
      return;
    }

    const botao = document.querySelector(
      '#denunciaForm button[type="submit"]'
    );

    botao.disabled = true;
    botao.innerText = "Enviando...";

    try {
      const opcaoIdentificacao = document.querySelector(
        'input[name="anonimo"]:checked'
      );

      const identificado =
        opcaoIdentificacao &&
        opcaoIdentificacao.value === "nao";

      const protocolo = gerarProtocolo();
      const turnstileToken = turnstile.getResponse();

      if (!turnstileToken) {
        alert("Confirme o captcha.");
        return;
      }

      const dados = {
        empresa_codigo: empresaAtual.codigo,
        protocolo,
        tipo_denuncia:
          document.getElementById("tipo_denuncia").value,
        urgencia:
          document.getElementById("urgencia").value,
        local_ocorrencia:
          document.getElementById("local_ocorrencia").value,
        setor:
          document.getElementById("setor").value,
        data_ocorrencia:
          document.getElementById("data_ocorrencia").value || null,
        denuncia_anonima:
          empresaAtual.permite_anonima ? !identificado : false,
        nome_denunciante:
          identificado
            ? document.getElementById("nome").value
            : null,
        email_denunciante:
          identificado
            ? document.getElementById("email").value
            : null,
        telefone_denunciante:
          identificado
            ? document.getElementById("telefone").value
            : null,
        descricao:
          document.getElementById("descricao").value,
        pessoas_envolvidas:
          document.getElementById("pessoas_envolvidas").value,
        testemunhas:
          document.getElementById("testemunhas").value,
        turnstileToken
      };

      const resposta = await fetch("/api/registrar-denuncia", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(dados)
      });

      const resultado = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          resultado.erro || "Erro ao registrar denúncia."
        );
      }

      alert(
        `Denúncia registrada com sucesso.\n\n` +
        `Protocolo: ${resultado.protocolo || protocolo}\n\n` +
        `Guarde este número.`
      );

      document.getElementById("denunciaForm").reset();
      document.getElementById("dadosIdentificacao").style.display = "none";

      turnstile.reset();

    } catch (erro) {
      alert(
        "Não foi possível registrar a denúncia.\n\n" +
        erro.message
      );

      console.error(erro);

    } finally {
      botao.disabled = false;
      botao.innerText = "Registrar Denúncia";
    }
  });

carregarEmpresa();
