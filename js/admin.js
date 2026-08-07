let denunciasCarregadas = [];
let usuarioLogado = null;

function escaparHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatarPerfil(perfil) {
  const nomes = {
    super_admin: "Super Administrador",
    cliente_admin: "Administrador da Empresa",
    gestor: "Gestor",
    leitura: "Somente Leitura"
  };

  return nomes[perfil] || perfil || "Não informado";
}

function configurarPerfilPainel() {
  document.body.classList.remove("usuario-super-admin");

  if (!usuarioLogado) {
    return;
  }

  if (usuarioLogado.perfil === "super_admin") {
    document.body.classList.add("usuario-super-admin");
  }
}

function exibirDadosUsuario() {
  if (!usuarioLogado) {
    return;
  }

  const perfilFormatado = formatarPerfil(
    usuarioLogado.perfil
  );

  const area =
    document.getElementById("dadosUsuarioLogado");

  const nomeEmpresa =
    usuarioLogado.empresa_nome || "Labor";

  if (area) {
    area.innerHTML = `
      <strong>${escaparHtml(usuarioLogado.nome)}</strong><br>
      ${escaparHtml(nomeEmpresa)}<br>
      ${escaparHtml(perfilFormatado)}
    `;
  }

  const nomeEmpresaPainel =
    document.getElementById("nomeEmpresaPainel");

  if (nomeEmpresaPainel) {
    nomeEmpresaPainel.textContent = nomeEmpresa;
  }

  const perfilUsuarioPainel =
    document.getElementById("perfilUsuarioPainel");

  if (perfilUsuarioPainel) {
    perfilUsuarioPainel.textContent =
      perfilFormatado;
  }

  const nomeUsuarioTopo =
    document.getElementById("nomeUsuarioTopo");

  if (nomeUsuarioTopo) {
    nomeUsuarioTopo.textContent =
      usuarioLogado.nome;
  }

  const empresaUsuarioTopo =
    document.getElementById("empresaUsuarioTopo");

  if (empresaUsuarioTopo) {
    empresaUsuarioTopo.textContent =
      nomeEmpresa;
  }
}

async function carregarIdentidadeEmpresa() {
  if (!usuarioLogado?.empresa_codigo) {
    return;
  }

  try {
    const resposta = await fetch(
      `/api/empresa-publica?codigo=${encodeURIComponent(
        usuarioLogado.empresa_codigo
      )}`
    );

    if (!resposta.ok) {
      return;
    }

    const empresa = await resposta.json();

    const logo =
      document.getElementById("logoPainel");

    if (logo && empresa.logo_url) {
      logo.src = empresa.logo_url;
      logo.alt = empresa.nome;
    }

    if (empresa.cor_secundaria) {
      document.documentElement.style.setProperty(
        "--laranja",
        empresa.cor_secundaria
      );
    }

  } catch (erro) {
    console.error(
      "Erro ao carregar identidade:",
      erro
    );
  }
}

function abrirPainel() {
  document.getElementById("loginCard").style.display =
    "none";

  document.getElementById("painelCard").style.display =
    "grid";

  configurarPerfilPainel();
  exibirDadosUsuario();
  carregarIdentidadeEmpresa();

  carregarDenuncias();

  abrirTelaPorNome("dashboard");
}

function abrirLogin() {
  denunciasCarregadas = [];
  usuarioLogado = null;

  sessionStorage.removeItem("usuarioPainel");

  document.body.classList.remove(
    "usuario-super-admin"
  );

  document.getElementById("loginCard").style.display =
    "flex";

  document.getElementById("painelCard").style.display =
    "none";

  const lista =
    document.getElementById("listaDenuncias");

  if (lista) {
    lista.innerHTML = "";
  }

  const resumo =
    document.getElementById("resumoDenuncias");

  if (resumo) {
    resumo.innerHTML = "";
  }
}

async function fazerLogin() {
  const usuario = document
    .getElementById("usuario")
    .value
    .trim();

  const senha = document
    .getElementById("senha")
    .value;

  const botao =
    document.getElementById("botaoLogin");

  const erroLogin =
    document.getElementById("erroLogin");

  erroLogin.innerText = "";

  if (!usuario || !senha) {
    erroLogin.innerText =
      "Informe o usuário e a senha.";

    return;
  }

  botao.disabled = true;
  botao.innerText = "Entrando...";

  try {
    const resposta = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        usuario,
        senha
      })
    });

    const resultado = await resposta.json();

    if (!resposta.ok) {
      throw new Error(
        resultado.erro ||
        "Usuário ou senha inválidos."
      );
    }

    usuarioLogado = resultado.usuario;

    sessionStorage.setItem(
      "usuarioPainel",
      JSON.stringify(usuarioLogado)
    );

    document.getElementById("senha").value = "";

    abrirPainel();

  } catch (erro) {
    erroLogin.innerText = erro.message;

    console.error(erro);

  } finally {
    botao.disabled = false;
    botao.innerText = "Entrar";
  }
}

async function sair() {
  try {
    await fetch("/api/logout", {
      method: "POST"
    });

  } catch (erro) {
    console.error(
      "Erro ao encerrar sessão:",
      erro
    );
  }

  abrirLogin();
}

function abrirTela(nomeTela, botao) {
  const telas =
    document.querySelectorAll(".admin-tela");

  telas.forEach((tela) => {
    tela.classList.remove("ativa");
  });

  const tela =
    document.getElementById(
      `tela-${nomeTela}`
    );

  if (!tela) {
    return;
  }

  tela.classList.add("ativa");

  document
    .querySelectorAll(".admin-menu-item")
    .forEach((item) => {
      item.classList.remove("ativo");
    });

  if (botao) {
    botao.classList.add("ativo");
  }

  atualizarTituloTela(nomeTela);

  if (nomeTela === "denuncias") {
    carregarDenuncias();
  }

  if (
    nomeTela === "empresas" &&
    usuarioLogado?.perfil === "super_admin"
  ) {
    carregarEmpresas();
  }
}

function abrirTelaPorNome(nomeTela) {
  const botao =
    document.querySelector(
      `.admin-menu-item[data-tela="${nomeTela}"]`
    );

  abrirTela(nomeTela, botao);
}

function atualizarTituloTela(nomeTela) {
  const configuracoes = {
    dashboard: {
      titulo: "Dashboard",
      subtitulo:
        "Visão geral do Canal de Denúncias."
    },

    denuncias: {
      titulo: "Denúncias",
      subtitulo:
        "Gestão e acompanhamento das ocorrências."
    },

    empresas: {
      titulo: "Empresas",
      subtitulo:
        "Gestão dos clientes da plataforma."
    },

    usuarios: {
      titulo: "Usuários",
      subtitulo:
        "Gestão dos usuários e perfis de acesso."
    },

    relatorios: {
      titulo: "Relatórios",
      subtitulo:
        "Relatórios gerenciais e exportações."
    },

    logs: {
      titulo: "Logs e Auditoria",
      subtitulo:
        "Histórico de acessos e alterações."
    },

    configuracoes: {
      titulo: "Configurações",
      subtitulo:
        "Configurações da empresa e do canal."
    }
  };

  const config =
    configuracoes[nomeTela];

  if (!config) {
    return;
  }

  document.getElementById(
    "tituloTela"
  ).textContent = config.titulo;

  document.getElementById(
    "subtituloTela"
  ).textContent = config.subtitulo;
}

async function carregarDenuncias() {
  const area =
    document.getElementById("listaDenuncias");

  if (area) {
    area.innerHTML =
      "Carregando denúncias...";
  }

  try {
    const resposta =
      await fetch("/api/denuncias");

    const resultado =
      await resposta.json();

    if (resposta.status === 401) {
      abrirLogin();

      throw new Error(
        "Sua sessão expirou. Faça login novamente."
      );
    }

    if (!resposta.ok) {
      throw new Error(
        resultado.erro ||
        "Erro ao carregar denúncias."
      );
    }

    denunciasCarregadas =
      Array.isArray(resultado)
        ? resultado
        : [];

    montarResumo(denunciasCarregadas);
    montarIndicadoresDashboard(
      denunciasCarregadas
    );

    aplicarFiltroStatus();

  } catch (erro) {
    console.error(erro);

    if (area) {
      area.innerHTML = `
        <p>${escaparHtml(erro.message)}</p>
      `;
    }
  }
}

function aplicarFiltroStatus() {
  const filtro =
    document.getElementById("filtroStatus");

  if (!filtro) {
    return;
  }

  const status = filtro.value;

  if (status === "Todos") {
    renderizarDenuncias(
      denunciasCarregadas
    );

    return;
  }

  const filtradas =
    denunciasCarregadas.filter(
      denuncia =>
        (denuncia.status || "Recebida") ===
        status
    );

  renderizarDenuncias(filtradas);
}

function montarResumo(denuncias) {
  const total = denuncias.length;

  const recebidas = denuncias.filter(
    d =>
      d.status === "Recebida" ||
      !d.status
  ).length;

  const emAnalise = denuncias.filter(
    d => d.status === "Em análise"
  ).length;

  const emInvestigacao =
    denuncias.filter(
      d => d.status === "Em investigação"
    ).length;

  const concluidas = denuncias.filter(
    d => d.status === "Concluída"
  ).length;

  const arquivadas = denuncias.filter(
    d => d.status === "Arquivada"
  ).length;

  const area =
    document.getElementById(
      "resumoDenuncias"
    );

  if (!area) {
    return;
  }

  area.innerHTML = `
    <div class="resumo-card">
      <strong>${total}</strong>
      <span>Total</span>
    </div>

    <div class="resumo-card">
      <strong>${recebidas}</strong>
      <span>Recebidas</span>
    </div>

    <div class="resumo-card">
      <strong>${emAnalise}</strong>
      <span>Em análise</span>
    </div>

    <div class="resumo-card">
      <strong>${emInvestigacao}</strong>
      <span>Em investigação</span>
    </div>

    <div class="resumo-card">
      <strong>${concluidas}</strong>
      <span>Concluídas</span>
    </div>

    <div class="resumo-card">
      <strong>${arquivadas}</strong>
      <span>Arquivadas</span>
    </div>
  `;
}

function montarIndicadoresDashboard(
  denuncias
) {
  const area =
    document.getElementById(
      "dashboardIndicadores"
    );

  if (!area) {
    return;
  }

  const criticas =
    denuncias.filter(
      d => d.urgencia === "Crítica"
    ).length;

  const abertas =
    denuncias.filter(
      d =>
        ![
          "Concluída",
          "Arquivada"
        ].includes(
          d.status || "Recebida"
        )
    ).length;

  const concluidas =
    denuncias.filter(
      d => d.status === "Concluída"
    ).length;

  area.innerHTML = `
    <p>
      <strong>Ocorrências abertas:</strong>
      ${abertas}
    </p>

    <p>
      <strong>Ocorrências críticas:</strong>
      ${criticas}
    </p>

    <p>
      <strong>Ocorrências concluídas:</strong>
      ${concluidas}
    </p>
  `;
}

function prioridadeIcone(urgencia) {
  if (urgencia === "Crítica") {
    return "🔴";
  }

  if (urgencia === "Alta") {
    return "🟠";
  }

  if (urgencia === "Média") {
    return "🟡";
  }

  return "🟢";
}

function renderizarDenuncias(
  denuncias
) {
  const area =
    document.getElementById(
      "listaDenuncias"
    );

  if (!area) {
    return;
  }

  if (denuncias.length === 0) {
    area.innerHTML =
      "<p>Nenhuma denúncia encontrada para este filtro.</p>";

    return;
  }

  area.innerHTML = `
    <div class="tabela-wrapper">

      <table class="tabela-denuncias">

        <thead>
          <tr>
            <th>Protocolo</th>
            <th>Data</th>
            <th>Tipo</th>
            <th>Urgência</th>
            <th>Status</th>
            <th>Ação</th>
          </tr>
        </thead>

        <tbody>

          ${denuncias.map(
            denuncia => `
              <tr>

                <td>
                  ${escaparHtml(
                    denuncia.protocolo
                  )}
                </td>

                <td>
                  ${
                    denuncia.criado_em
                      ? new Date(
                          denuncia.criado_em
                        ).toLocaleDateString(
                          "pt-BR"
                        )
                      : "Não informada"
                  }
                </td>

                <td>
                  ${escaparHtml(
                    denuncia.tipo_denuncia
                  )}
                </td>

                <td>
                  ${prioridadeIcone(
                    denuncia.urgencia
                  )}
                  ${escaparHtml(
                    denuncia.urgencia
                  )}
                </td>

                <td>
                  ${escaparHtml(
                    denuncia.status ||
                    "Recebida"
                  )}
                </td>

                <td>
                  <button
                    type="button"
                    class="btn-pequeno"
                    onclick="abrirDetalhes(${Number(
                      denuncia.id
                    )})"
                  >
                    Abrir
                  </button>
                </td>

              </tr>
            `
          ).join("")}

        </tbody>

      </table>

    </div>
  `;
}

function abrirDetalhes(id) {
  const denuncia =
    denunciasCarregadas.find(
      item =>
        Number(item.id) ===
        Number(id)
    );

  if (!denuncia) {
    return;
  }

  document.getElementById(
    "modalDetalhes"
  ).style.display = "flex";

  document.getElementById(
    "conteudoDetalhes"
  ).innerHTML = `

    <h2>
      ${escaparHtml(
        denuncia.protocolo
      )}
    </h2>

    <p>
      <strong>Data:</strong>
      ${
        denuncia.criado_em
          ? new Date(
              denuncia.criado_em
            ).toLocaleString("pt-BR")
          : "Não informada"
      }
    </p>

    <p>
      <strong>Tipo:</strong>
      ${escaparHtml(
        denuncia.tipo_denuncia
      )}
    </p>

    <p>
      <strong>Urgência:</strong>
      ${prioridadeIcone(
        denuncia.urgencia
      )}
      ${escaparHtml(
        denuncia.urgencia
      )}
    </p>

    <p>
      <strong>Setor:</strong>
      ${escaparHtml(
        denuncia.setor ||
        "Não informado"
      )}
    </p>

    <p>
      <strong>Local:</strong>
      ${escaparHtml(
        denuncia.local_ocorrencia ||
        "Não informado"
      )}
    </p>

    <p>
      <strong>Status atual:</strong>
      ${escaparHtml(
        denuncia.status ||
        "Recebida"
      )}
    </p>

    <label for="statusDetalhe">
      Alterar Status
    </label>

    <select id="statusDetalhe">

      <option ${
        !denuncia.status ||
        denuncia.status === "Recebida"
          ? "selected"
          : ""
      }>
        Recebida
      </option>

      <option ${
        denuncia.status === "Em análise"
          ? "selected"
          : ""
      }>
        Em análise
      </option>

      <option ${
        denuncia.status ===
        "Em investigação"
          ? "selected"
          : ""
      }>
        Em investigação
      </option>

      <option ${
        denuncia.status === "Concluída"
          ? "selected"
          : ""
      }>
        Concluída
      </option>

      <option ${
        denuncia.status === "Arquivada"
          ? "selected"
          : ""
      }>
        Arquivada
      </option>

    </select>

    <button
      type="button"
      onclick="salvarStatusDetalhe(${Number(
        denuncia.id
      )})"
    >
      Salvar Status
    </button>

    <hr>

    <h3>Descrição</h3>

    <p>
      ${escaparHtml(
        denuncia.descricao ||
        "Não informada"
      )}
    </p>

    <h3>Pessoas Envolvidas</h3>

    <p>
      ${escaparHtml(
        denuncia.pessoas_envolvidas ||
        "Não informado"
      )}
    </p>

    <h3>Testemunhas</h3>

    <p>
      ${escaparHtml(
        denuncia.testemunhas ||
        "Não informado"
      )}
    </p>

    <h3>Identificação</h3>

    <p>
      <strong>Anônima:</strong>
      ${
        denuncia.denuncia_anonima
          ? "Sim"
          : "Não"
      }
    </p>

    <p>
      <strong>Nome:</strong>
      ${escaparHtml(
        denuncia.nome_denunciante ||
        "Não informado"
      )}
    </p>

    <p>
      <strong>E-mail:</strong>
      ${escaparHtml(
        denuncia.email_denunciante ||
        "Não informado"
      )}
    </p>

    <p>
      <strong>Telefone:</strong>
      ${escaparHtml(
        denuncia.telefone_denunciante ||
        "Não informado"
      )}
    </p>

    <hr>

    <h3>
      Ação tomada — registro interno
    </h3>

    <p>
      Este campo é exclusivo do painel administrativo
      e não será mostrado na consulta pública do protocolo.
    </p>

    <textarea
      id="acaoTomada"
      rows="7"
      placeholder="Descreva as providências, contatos realizados, verificações, medidas corretivas e demais ações tomadas."
    >${escaparHtml(
      denuncia.acao_tomada || ""
    )}</textarea>

    <button
      type="button"
      id="botaoSalvarAcao"
      onclick="salvarAcao(${Number(
        denuncia.id
      )})"
    >
      Salvar ação tomada
    </button>
  `;
}

function fecharDetalhes() {
  document.getElementById(
    "modalDetalhes"
  ).style.display = "none";
}

async function salvarStatusDetalhe(id) {
  const status =
    document.getElementById(
      "statusDetalhe"
    ).value;

  await atualizarStatus(
    id,
    status
  );
}

async function atualizarStatus(
  id,
  status
) {
  try {
    const resposta =
      await fetch(
        "/api/atualizar-status",
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            id,
            status
          })
        }
      );

    const resultado =
      await resposta.json();

    if (!resposta.ok) {
      throw new Error(
        resultado.erro ||
        "Erro ao atualizar status."
      );
    }

    fecharDetalhes();

    await carregarDenuncias();

  } catch (erro) {
    alert(
      "Não foi possível atualizar o status: " +
      erro.message
    );

    console.error(erro);
  }
}

async function salvarAcao(id) {
  const campo =
    document.getElementById(
      "acaoTomada"
    );

  const botao =
    document.getElementById(
      "botaoSalvarAcao"
    );

  if (!campo || !botao) {
    alert(
      "Campo de ação tomada não encontrado."
    );

    return;
  }

  const acaoTomada =
    campo.value.trim();

  botao.disabled = true;
  botao.innerText = "Salvando...";

  try {
    const resposta =
      await fetch(
        "/api/salvar-acao",
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            id,
            acao_tomada:
              acaoTomada
          })
        }
      );

    const resultado =
      await resposta.json();

    if (!resposta.ok) {
      throw new Error(
        resultado.erro ||
        "Erro ao salvar ação tomada."
      );
    }

    alert(
      "Ação tomada salva com sucesso."
    );

    await carregarDenuncias();

    const atualizada =
      denunciasCarregadas.find(
        item =>
          Number(item.id) ===
          Number(id)
      );

    if (atualizada) {
      abrirDetalhes(id);
    }

  } catch (erro) {
    alert(
      "Não foi possível salvar: " +
      erro.message
    );

    console.error(erro);

  } finally {
    botao.disabled = false;

    botao.innerText =
      "Salvar ação tomada";
  }
}

async function carregarEmpresas() {
  const area =
    document.getElementById(
      "areaEmpresas"
    );

  if (!area) {
    return;
  }

  area.innerHTML =
    "Carregando empresas...";

  try {
    const resposta =
      await fetch("/api/empresas");

    const empresas =
      await resposta.json();

    if (!resposta.ok) {
      throw new Error(
        empresas.erro ||
        "Erro ao carregar empresas."
      );
    }

    if (!empresas.length) {
      area.innerHTML =
        "<p>Nenhuma empresa cadastrada.</p>";

      return;
    }

    area.innerHTML = `
      <div class="tabela-wrapper">

        <table class="tabela-denuncias">

          <thead>
            <tr>
              <th>Empresa</th>
              <th>Código</th>
              <th>Plano</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>

            ${empresas.map(
              empresa => `
                <tr>

                  <td>
                    ${escaparHtml(
                      empresa.nome
                    )}
                  </td>

                  <td>
                    ${escaparHtml(
                      empresa.codigo
                    )}
                  </td>

                  <td>
                    ${escaparHtml(
                      empresa.plano ||
                      "Starter"
                    )}
                  </td>

                  <td>
                    ${
                      empresa.bloqueada
                        ? "Bloqueada"
                        : empresa.ativo
                          ? "Ativa"
                          : "Inativa"
                    }
                  </td>

                </tr>
              `
            ).join("")}

          </tbody>

        </table>

      </div>
    `;

  } catch (erro) {
    area.innerHTML = `
      <p>${escaparHtml(
        erro.message
      )}</p>
    `;
  }
}

document
  .getElementById("loginForm")
  .addEventListener(
    "submit",
    function (evento) {
      evento.preventDefault();

      fazerLogin();
    }
  );

document.addEventListener(
  "DOMContentLoaded",
  function () {
    const usuarioSalvo =
      sessionStorage.getItem(
        "usuarioPainel"
      );

    if (!usuarioSalvo) {
      abrirLogin();
      return;
    }

    try {
      usuarioLogado =
        JSON.parse(usuarioSalvo);

      abrirPainel();

    } catch (erro) {
      console.error(erro);

      abrirLogin();
    }
  }
);
