let denunciasCarregadas = [];
let empresasCarregadas = [];
let usuariosCarregados = [];
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

function urlCanal(codigo) {
  return `${window.location.origin}/?empresa=${encodeURIComponent(codigo)}`;
}

function urlConsulta(codigo) {
  return `${window.location.origin}/consulta.html?empresa=${encodeURIComponent(codigo)}`;
}

function configurarPerfilPainel() {
  document.body.classList.remove("usuario-super-admin");

  if (usuarioLogado?.perfil === "super_admin") {
    document.body.classList.add("usuario-super-admin");
  }
}

function exibirDadosUsuario() {
  if (!usuarioLogado) return;

  const perfil = formatarPerfil(usuarioLogado.perfil);
  const empresa = usuarioLogado.empresa_nome || "Labor";

  const dados = document.getElementById("dadosUsuarioLogado");

  if (dados) {
    dados.innerHTML = `
      <strong>${escaparHtml(usuarioLogado.nome)}</strong><br>
      ${escaparHtml(empresa)}<br>
      ${escaparHtml(perfil)}
    `;
  }

  document.getElementById("nomeEmpresaPainel").textContent = empresa;
  document.getElementById("perfilUsuarioPainel").textContent = perfil;
  document.getElementById("nomeUsuarioTopo").textContent = usuarioLogado.nome;
  document.getElementById("empresaUsuarioTopo").textContent = empresa;
}

async function carregarIdentidadeEmpresa() {
  if (!usuarioLogado?.empresa_codigo) return;

  try {
    const resposta = await fetch(
      `/api/empresa-publica?codigo=${encodeURIComponent(usuarioLogado.empresa_codigo)}`
    );

    if (!resposta.ok) return;

    const empresa = await resposta.json();

    const logo = document.getElementById("logoPainel");

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
    console.error("Erro ao carregar identidade:", erro);
  }
}

function abrirPainel() {
  document.getElementById("loginCard").style.display = "none";
  document.getElementById("painelCard").style.display = "grid";

  configurarPerfilPainel();
  exibirDadosUsuario();
  carregarIdentidadeEmpresa();
  carregarDenuncias();
  carregarDashboardSaas();
  abrirTelaPorNome("dashboard");
}

function abrirLogin() {
  denunciasCarregadas = [];
  empresasCarregadas = [];
  usuarioLogado = null;

  sessionStorage.removeItem("usuarioPainel");

  document.body.classList.remove("usuario-super-admin");

  document.getElementById("loginCard").style.display = "flex";
  document.getElementById("painelCard").style.display = "none";
}

async function fazerLogin() {
  const usuario = document.getElementById("usuario").value.trim();
  const senha = document.getElementById("senha").value;

  const botao = document.getElementById("botaoLogin");
  const erroLogin = document.getElementById("erroLogin");

  erroLogin.innerText = "";

  if (!usuario || !senha) {
    erroLogin.innerText = "Informe o usuário e a senha.";
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
      body: JSON.stringify({ usuario, senha })
    });

    const resultado = await resposta.json();

    if (!resposta.ok) {
      throw new Error(resultado.erro || "Usuário ou senha inválidos.");
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
    console.error(erro);
  }

  abrirLogin();
}

function abrirTela(nomeTela, botao) {
  if (
    ["empresas", "usuarios"].includes(nomeTela) &&
    usuarioLogado?.perfil !== "super_admin"
  ) {
    return;
  }

  document.querySelectorAll(".admin-tela").forEach(tela => {
    tela.classList.remove("ativa");
  });

  const tela = document.getElementById(`tela-${nomeTela}`);

  if (!tela) return;

  tela.classList.add("ativa");

  document.querySelectorAll(".admin-menu-item").forEach(item => {
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
  if (
    nomeTela === "usuarios" &&
    usuarioLogado?.perfil === "super_admin"
  ) {
    carregarUsuarios();
  }
}

  
function abrirTelaPorNome(nomeTela) {
  const botao = document.querySelector(
    `.admin-menu-item[data-tela="${nomeTela}"]`
  );

  abrirTela(nomeTela, botao);
}

function atualizarTituloTela(nomeTela) {
  const configuracoes = {
    dashboard: ["Dashboard", "Visão geral do Canal de Denúncias."],
    denuncias: ["Denúncias", "Gestão e acompanhamento das ocorrências."],
    empresas: ["Empresas", "Gestão dos clientes da plataforma."],
    usuarios: ["Usuários", "Gestão dos usuários e perfis de acesso."],
    relatorios: ["Relatórios", "Relatórios gerenciais e exportações."],
    logs: ["Logs e Auditoria", "Histórico de acessos e alterações."],
    configuracoes: ["Configurações", "Configurações da empresa e do canal."]
  };

  const config = configuracoes[nomeTela];

  if (!config) return;

  document.getElementById("tituloTela").textContent = config[0];
  document.getElementById("subtituloTela").textContent = config[1];
}

/* =========================================================
   DENÚNCIAS
   ========================================================= */

async function carregarDenuncias() {
  const area = document.getElementById("listaDenuncias");

  if (area) {
    area.innerHTML = "Carregando denúncias...";
  }

  try {
    const resposta = await fetch("/api/denuncias");
    const resultado = await resposta.json();

    if (resposta.status === 401) {
      abrirLogin();
      throw new Error("Sua sessão expirou. Faça login novamente.");
    }

    if (!resposta.ok) {
      throw new Error(resultado.erro || "Erro ao carregar denúncias.");
    }

    denunciasCarregadas =
      Array.isArray(resultado) ? resultado : [];

    montarResumo(denunciasCarregadas);
    montarIndicadoresDashboard(denunciasCarregadas);
    aplicarFiltroStatus();

  } catch (erro) {
    console.error(erro);

    if (area) {
      area.innerHTML = `<p>${escaparHtml(erro.message)}</p>`;
    }
  }
}

function aplicarFiltroStatus() {
  const filtro = document.getElementById("filtroStatus");

  if (!filtro) return;

  if (filtro.value === "Todos") {
    renderizarDenuncias(denunciasCarregadas);
    return;
  }

  renderizarDenuncias(
    denunciasCarregadas.filter(
      d => (d.status || "Recebida") === filtro.value
    )
  );
}

function montarResumo(denuncias) {
  const area = document.getElementById("resumoDenuncias");

  if (!area) return;

  const contar = status =>
    denuncias.filter(d => (d.status || "Recebida") === status).length;

  area.innerHTML = `
    <div class="resumo-card"><strong>${denuncias.length}</strong><span>Total</span></div>
    <div class="resumo-card"><strong>${contar("Recebida")}</strong><span>Recebidas</span></div>
    <div class="resumo-card"><strong>${contar("Em análise")}</strong><span>Em análise</span></div>
    <div class="resumo-card"><strong>${contar("Em investigação")}</strong><span>Em investigação</span></div>
    <div class="resumo-card"><strong>${contar("Concluída")}</strong><span>Concluídas</span></div>
    <div class="resumo-card"><strong>${contar("Arquivada")}</strong><span>Arquivadas</span></div>
  `;
}

function montarIndicadoresDashboard(denuncias) {
  const areaIndicadores =
    document.getElementById("dashboardIndicadores");

  const areaDesempenho =
    document.getElementById("dashboardDesempenho");

  const areaStatus =
    document.getElementById("dashboardStatus");

  const areaUrgencias =
    document.getElementById("dashboardUrgencias");

  if (
    !areaIndicadores ||
    !areaDesempenho ||
    !areaStatus ||
    !areaUrgencias
  ) {
    return;
  }

  const agora = new Date();

  const inicioMes = new Date(
    agora.getFullYear(),
    agora.getMonth(),
    1
  );

  const total = denuncias.length;

  const abertas = denuncias.filter(
    d =>
      ![
        "Concluída",
        "Arquivada"
      ].includes(
        d.status || "Recebida"
      )
  );

  const criticas = denuncias.filter(
    d => d.urgencia === "Crítica"
  );

  const recebidasMes = denuncias.filter(
    d =>
      d.criado_em &&
      new Date(d.criado_em) >= inicioMes
  );

  const concluidas = denuncias.filter(
    d => d.status === "Concluída"
  );

  const concluidasMes = concluidas.filter(
    d =>
      d.atualizado_em &&
      new Date(d.atualizado_em) >= inicioMes
  );

  const taxaConclusao =
    total > 0
      ? Math.round(
          (concluidas.length / total) * 100
        )
      : 0;

  let somaDiasAbertas = 0;

  abertas.forEach(d => {
    if (!d.criado_em) {
      return;
    }

    const criado =
      new Date(d.criado_em);

    const diferenca =
      agora.getTime() -
      criado.getTime();

    somaDiasAbertas +=
      Math.max(
        0,
        diferenca / 86400000
      );
  });

  const idadeMedia =
    abertas.length > 0
      ? (
          somaDiasAbertas /
          abertas.length
        ).toFixed(1)
      : "0";

  areaIndicadores.innerHTML = `
    <div class="dashboard-indicador">
      <span>Ocorrências abertas</span>
      <strong>${abertas.length}</strong>
    </div>

    <div class="dashboard-indicador">
      <span>Prioridade crítica</span>
      <strong>${criticas.length}</strong>
    </div>

    <div class="dashboard-indicador">
      <span>Recebidas neste mês</span>
      <strong>${recebidasMes.length}</strong>
    </div>

    <div class="dashboard-indicador">
      <span>Concluídas neste mês</span>
      <strong>${concluidasMes.length}</strong>
    </div>
  `;

  areaDesempenho.innerHTML = `
    <div class="dashboard-indicador">
      <span>Taxa geral de conclusão</span>
      <strong>${taxaConclusao}%</strong>
    </div>

    <div class="dashboard-indicador">
      <span>Idade média das ocorrências abertas</span>
      <strong>${idadeMedia} dias</strong>
    </div>

    <div class="dashboard-indicador">
      <span>Total histórico</span>
      <strong>${total}</strong>
    </div>

    <div class="dashboard-indicador">
      <span>Encerradas</span>
      <strong>
        ${
          denuncias.filter(
            d =>
              [
                "Concluída",
                "Arquivada"
              ].includes(d.status)
          ).length
        }
      </strong>
    </div>
  `;

  const statusLista = [
    "Recebida",
    "Em análise",
    "Em investigação",
    "Concluída",
    "Arquivada"
  ];

  areaStatus.innerHTML =
    statusLista.map(status => {

      const quantidade =
        denuncias.filter(
          d =>
            (d.status || "Recebida") ===
            status
        ).length;

      const percentual =
        total > 0
          ? Math.round(
              quantidade /
              total *
              100
            )
          : 0;

      return `
        <div class="dashboard-barra-item">

          <div class="dashboard-barra-topo">
            <span>
              ${escaparHtml(status)}
            </span>

            <strong>
              ${quantidade}
              (${percentual}%)
            </strong>
          </div>

          <div class="dashboard-barra">
            <div
              class="dashboard-barra-preenchimento"
              style="width:${percentual}%"
            ></div>
          </div>

        </div>
      `;

    }).join("");

  const urgencias = [
    "Crítica",
    "Alta",
    "Média",
    "Baixa"
  ];

  areaUrgencias.innerHTML =
    urgencias.map(urgencia => {

      const quantidade =
        denuncias.filter(
          d => d.urgencia === urgencia
        ).length;

      const percentual =
        total > 0
          ? Math.round(
              quantidade /
              total *
              100
            )
          : 0;

      return `
        <div class="dashboard-barra-item">

          <div class="dashboard-barra-topo">

            <span>
              ${prioridadeIcone(urgencia)}
              ${escaparHtml(urgencia)}
            </span>

            <strong>
              ${quantidade}
            </strong>

          </div>

          <div class="dashboard-barra">
            <div
              class="dashboard-barra-preenchimento"
              style="width:${percentual}%"
            ></div>
          </div>

        </div>
      `;

    }).join("");
}

function prioridadeIcone(urgencia) {
  if (urgencia === "Crítica") return "🔴";
  if (urgencia === "Alta") return "🟠";
  if (urgencia === "Média") return "🟡";
  return "🟢";
}

function renderizarDenuncias(denuncias) {
  const area = document.getElementById("listaDenuncias");

  if (!area) return;

  if (!denuncias.length) {
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
          ${denuncias.map(d => `
            <tr>
              <td>${escaparHtml(d.protocolo)}</td>

              <td>
                ${
                  d.criado_em
                    ? new Date(d.criado_em).toLocaleDateString("pt-BR")
                    : "Não informada"
                }
              </td>

              <td>${escaparHtml(d.tipo_denuncia)}</td>

              <td>
                ${prioridadeIcone(d.urgencia)}
                ${escaparHtml(d.urgencia)}
              </td>

              <td>
                ${escaparHtml(d.status || "Recebida")}
              </td>

              <td>
                <button
                  type="button"
                  class="btn-pequeno"
                  onclick="abrirDetalhes(${Number(d.id)})"
                >
                  Abrir
                </button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function abrirDetalhes(id) {
  const d = denunciasCarregadas.find(
    item => Number(item.id) === Number(id)
  );

  if (!d) return;

  const somenteLeitura =
    usuarioLogado?.perfil === "leitura";

  document.getElementById("modalDetalhes").style.display = "flex";

  document.getElementById("conteudoDetalhes").innerHTML = `
    <h2>${escaparHtml(d.protocolo)}</h2>

    <p><strong>Data:</strong> ${
      d.criado_em
        ? new Date(d.criado_em).toLocaleString("pt-BR")
        : "Não informada"
    }</p>

    <p><strong>Tipo:</strong> ${escaparHtml(d.tipo_denuncia)}</p>
    <p><strong>Urgência:</strong> ${prioridadeIcone(d.urgencia)} ${escaparHtml(d.urgencia)}</p>
    <p><strong>Setor:</strong> ${escaparHtml(d.setor || "Não informado")}</p>
    <p><strong>Local:</strong> ${escaparHtml(d.local_ocorrencia || "Não informado")}</p>
    <p><strong>Status atual:</strong> ${escaparHtml(d.status || "Recebida")}</p>

    ${
      somenteLeitura
        ? ""
        : `
          <label>Alterar Status</label>

          <select id="statusDetalhe">
            ${[
              "Recebida",
              "Em análise",
              "Em investigação",
              "Concluída",
              "Arquivada"
            ].map(status => `
              <option ${
                (d.status || "Recebida") === status
                  ? "selected"
                  : ""
              }>
                ${status}
              </option>
            `).join("")}
          </select>

          <button onclick="salvarStatusDetalhe(${Number(d.id)})">
            Salvar Status
          </button>
        `
    }

    <hr>

    <h3>Descrição</h3>
    <p>${escaparHtml(d.descricao || "Não informada")}</p>

    <h3>Pessoas Envolvidas</h3>
    <p>${escaparHtml(d.pessoas_envolvidas || "Não informado")}</p>

    <h3>Testemunhas</h3>
    <p>${escaparHtml(d.testemunhas || "Não informado")}</p>

    <h3>Identificação</h3>
    <p><strong>Anônima:</strong> ${d.denuncia_anonima ? "Sim" : "Não"}</p>
    <p><strong>Nome:</strong> ${escaparHtml(d.nome_denunciante || "Não informado")}</p>
    <p><strong>E-mail:</strong> ${escaparHtml(d.email_denunciante || "Não informado")}</p>
    <p><strong>Telefone:</strong> ${escaparHtml(d.telefone_denunciante || "Não informado")}</p>

    ${
      somenteLeitura
        ? ""
        : `
          <hr>

          <h3>Ação tomada — registro interno</h3>

          <textarea
            id="acaoTomada"
            rows="7"
          >${escaparHtml(d.acao_tomada || "")}</textarea>

          <button
            id="botaoSalvarAcao"
            onclick="salvarAcao(${Number(d.id)})"
          >
            Salvar ação tomada
          </button>
        `
    }
  `;
}

function fecharDetalhes() {
  document.getElementById("modalDetalhes").style.display = "none";
}

async function salvarStatusDetalhe(id) {
  await atualizarStatus(
    id,
    document.getElementById("statusDetalhe").value
  );
}

async function atualizarStatus(id, status) {
  try {
    const resposta = await fetch("/api/atualizar-status", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ id, status })
    });

    const resultado = await resposta.json();

    if (!resposta.ok) {
      throw new Error(resultado.erro || "Erro ao atualizar status.");
    }

    fecharDetalhes();
    await carregarDenuncias();

  } catch (erro) {
    alert("Não foi possível atualizar o status: " + erro.message);
  }
}

async function salvarAcao(id) {
  const campo = document.getElementById("acaoTomada");
  const botao = document.getElementById("botaoSalvarAcao");

  const acaoTomada = campo.value.trim();

  botao.disabled = true;
  botao.innerText = "Salvando...";

  try {
    const resposta = await fetch("/api/salvar-acao", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        id,
        acao_tomada: acaoTomada
      })
    });

    const resultado = await resposta.json();

    if (!resposta.ok) {
      throw new Error(resultado.erro || "Erro ao salvar.");
    }

    alert("Ação tomada salva com sucesso.");

    await carregarDenuncias();
    abrirDetalhes(id);

  } catch (erro) {
    alert("Não foi possível salvar: " + erro.message);

  } finally {
    botao.disabled = false;
    botao.innerText = "Salvar ação tomada";
  }
}

/* =========================================================
   EMPRESAS
   ========================================================= */

async function carregarEmpresas() {
  const area = document.getElementById("areaEmpresas");

  area.innerHTML = "Carregando empresas...";

  try {
    const resposta = await fetch("/api/empresas");
    const empresas = await resposta.json();

    if (!resposta.ok) {
      throw new Error(empresas.erro || "Erro ao carregar empresas.");
    }

    empresasCarregadas = empresas;

    renderizarEmpresas();

  } catch (erro) {
    area.innerHTML = `<p>${escaparHtml(erro.message)}</p>`;
  }
}

function renderizarEmpresas() {
  const area = document.getElementById("areaEmpresas");

  if (!empresasCarregadas.length) {
    area.innerHTML = "<p>Nenhuma empresa cadastrada.</p>";
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
            <th>Canal dos colaboradores</th>
            <th>Ações</th>
          </tr>
        </thead>

        <tbody>

          ${empresasCarregadas.map(empresa => {

            const link = urlCanal(empresa.codigo);

            let status = `
              <span class="admin-status admin-status-ativa">
                Ativa
              </span>
            `;

            if (empresa.bloqueada) {
              status = `
                <span class="admin-status admin-status-bloqueada">
                  Bloqueada
                </span>
              `;
            } else if (!empresa.ativo) {
              status = `
                <span class="admin-status admin-status-inativa">
                  Inativa
                </span>
              `;
            }

            return `
              <tr>

                <td>
                  <strong>${escaparHtml(empresa.nome)}</strong>
                </td>

                <td>
                  ${escaparHtml(empresa.codigo)}
                </td>

                <td>
                  ${escaparHtml(empresa.plano || "Starter")}
                </td>

                <td>
                  ${status}
                </td>

                <td>
                  <div class="admin-link-lista">
                    ${escaparHtml(link)}
                  </div>
                </td>

                <td>
                  <div class="admin-acoes-tabela">

                    <button
                      type="button"
                      class="admin-btn-editar"
                      onclick="editarEmpresa(${Number(empresa.id)})"
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      class="admin-btn-copiar"
                      onclick="copiarLinkCanal('${escaparHtml(empresa.codigo)}')"
                    >
                      Copiar link
                    </button>

                    <button
                      type="button"
                      class="admin-btn-abrir"
                      onclick="abrirCanalEmpresa('${escaparHtml(empresa.codigo)}')"
                    >
                      Abrir canal
                    </button>

                  </div>
                </td>

              </tr>
            `;
          }).join("")}

        </tbody>

      </table>

    </div>
  `;
}

function novaEmpresa() {
  limparFormularioEmpresa();

  document.getElementById("tituloModalEmpresa").textContent =
    "Nova Empresa";

  document.getElementById("modalEmpresa").style.display =
    "flex";

  atualizarPreviewLink();
}

function editarEmpresa(id) {
  const empresa = empresasCarregadas.find(
    item => Number(item.id) === Number(id)
  );

  if (!empresa) return;

  document.getElementById("empresaId").value =
    empresa.id;

  document.getElementById("empresaNome").value =
    empresa.nome || "";

  document.getElementById("empresaNomeCurto").value =
    empresa.nome_curto || "";

  document.getElementById("empresaCodigo").value =
    empresa.codigo || "";

  document.getElementById("empresaCnpj").value =
    empresa.cnpj || "";

  document.getElementById("empresaEmail").value =
    empresa.email_contato || "";

  document.getElementById("empresaTelefone").value =
    empresa.telefone || "";

  document.getElementById("empresaSite").value =
    empresa.site || "";

  document.getElementById("empresaPlano").value =
    empresa.plano || "Starter";

  document.getElementById("empresaLimiteUsuarios").value =
    empresa.limite_usuarios || 3;

  document.getElementById("empresaLimiteDenuncias").value =
    empresa.limite_denuncias ?? "";

  document.getElementById("empresaDataVencimento").value =
    empresa.data_vencimento || "";

  document.getElementById("empresaLogoUrl").value =
    empresa.logo_url || "";

  document.getElementById("empresaCorPrincipal").value =
    empresa.cor_principal || "#0b3b73";

  document.getElementById("empresaCorSecundaria").value =
    empresa.cor_secundaria || "#0ea5e9";

  document.getElementById("empresaNomeCanal").value =
    empresa.nome_canal || "Canal de Denúncias";

  document.getElementById("empresaMensagemInicial").value =
    empresa.mensagem_inicial || "";

  document.getElementById("empresaPermiteAnonima").checked =
    empresa.permite_anonima !== false;

  document.getElementById("empresaAtiva").checked =
    empresa.ativo !== false;

  document.getElementById("empresaBloqueada").checked =
    empresa.bloqueada === true;

  document.getElementById("tituloModalEmpresa").textContent =
    "Editar Empresa";

  atualizarPreviewLink();

  document.getElementById("modalEmpresa").style.display =
    "flex";
}

function fecharModalEmpresa() {
  document.getElementById("modalEmpresa").style.display =
    "none";
}

function limparFormularioEmpresa() {
  document.getElementById("formEmpresa").reset();

  document.getElementById("empresaId").value = "";
  document.getElementById("empresaPlano").value = "Starter";
  document.getElementById("empresaLimiteUsuarios").value = 3;
  document.getElementById("empresaCorPrincipal").value = "#0b3b73";
  document.getElementById("empresaCorSecundaria").value = "#0ea5e9";
  document.getElementById("empresaNomeCanal").value = "Canal de Denúncias";
  document.getElementById("empresaPermiteAnonima").checked = true;
  document.getElementById("empresaAtiva").checked = true;
  document.getElementById("empresaBloqueada").checked = false;
}

function atualizarPreviewLink() {
  const codigo = document
    .getElementById("empresaCodigo")
    .value
    .trim()
    .toLowerCase();

  const area = document.getElementById("previewLinkEmpresa");

  area.innerHTML = codigo
    ? `
      <strong>Link que será entregue aos colaboradores:</strong><br>
      ${escaparHtml(urlCanal(codigo))}
    `
    : `
      O link do canal será exibido aqui depois de informar o código.
    `;
}

async function salvarEmpresa(evento) {
  evento.preventDefault();

  const id = Number(
    document.getElementById("empresaId").value
  );

  const dados = {
    nome: document.getElementById("empresaNome").value.trim(),
    nome_curto: document.getElementById("empresaNomeCurto").value.trim(),
    codigo: document.getElementById("empresaCodigo").value.trim().toLowerCase(),
    cnpj: document.getElementById("empresaCnpj").value.trim(),
    email_contato: document.getElementById("empresaEmail").value.trim(),
    telefone: document.getElementById("empresaTelefone").value.trim(),
    site: document.getElementById("empresaSite").value.trim(),
    plano: document.getElementById("empresaPlano").value,
    limite_usuarios: Number(
      document.getElementById("empresaLimiteUsuarios").value || 3
    ),
    limite_denuncias:
      document.getElementById("empresaLimiteDenuncias").value || null,
    data_vencimento:
      document.getElementById("empresaDataVencimento").value || null,
    logo_url: document.getElementById("empresaLogoUrl").value.trim(),
    cor_principal: document.getElementById("empresaCorPrincipal").value,
    cor_secundaria: document.getElementById("empresaCorSecundaria").value,
    nome_canal: document.getElementById("empresaNomeCanal").value.trim(),
    mensagem_inicial: document.getElementById("empresaMensagemInicial").value.trim(),
    permite_anonima:
      document.getElementById("empresaPermiteAnonima").checked,
    ativo:
      document.getElementById("empresaAtiva").checked,
    bloqueada:
      document.getElementById("empresaBloqueada").checked
  };

  if (id) {
    dados.id = id;
  }

  const botao = document.getElementById("botaoSalvarEmpresa");

  botao.disabled = true;
  botao.innerText = "Salvando...";

  try {
    const resposta = await fetch("/api/empresas", {
      method: id ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(dados)
    });

    const resultado = await resposta.json();

    if (!resposta.ok) {
      throw new Error(resultado.erro || "Erro ao salvar empresa.");
    }

    alert(
      id
        ? "Empresa atualizada com sucesso."
        : "Empresa cadastrada com sucesso."
    );

    fecharModalEmpresa();
    await carregarEmpresas();

  } catch (erro) {
    alert("Não foi possível salvar a empresa: " + erro.message);

  } finally {
    botao.disabled = false;
    botao.innerText = "Salvar Empresa";
  }
}

async function copiarLinkCanal(codigo) {
  const link = urlCanal(codigo);

  try {
    await navigator.clipboard.writeText(link);

    alert("Link do canal copiado.");

  } catch {
    prompt(
      "Copie o link abaixo:",
      link
    );
  }
}

function abrirCanalEmpresa(codigo) {
  window.open(
    urlCanal(codigo),
    "_blank",
    "noopener,noreferrer"
  );
}

/* =========================================================
   USUÁRIOS
   ========================================================= */

async function carregarUsuarios() {
  const area = document.getElementById("areaUsuarios");

  if (!area) {
    return;
  }

  area.innerHTML = "Carregando usuários...";

  try {
    const resposta = await fetch("/api/usuarios");
    const usuarios = await resposta.json();

    if (!resposta.ok) {
      throw new Error(
        usuarios.erro || "Erro ao carregar usuários."
      );
    }

    usuariosCarregados =
      Array.isArray(usuarios) ? usuarios : [];

    renderizarUsuarios();

  } catch (erro) {
    console.error(erro);

    area.innerHTML = `
      <p>${escaparHtml(erro.message)}</p>
    `;
  }
}

function renderizarUsuarios() {
  const area = document.getElementById("areaUsuarios");

  if (!area) {
    return;
  }

  if (!usuariosCarregados.length) {
    area.innerHTML =
      "<p>Nenhum usuário cadastrado.</p>";

    return;
  }

  area.innerHTML = `
    <div class="tabela-wrapper">

      <table class="tabela-denuncias">

        <thead>
          <tr>
            <th>Nome</th>
            <th>Usuário</th>
            <th>Empresa</th>
            <th>Perfil</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>

        <tbody>

          ${usuariosCarregados.map(usuario => {

            let nomeEmpresa = "Labor";

            if (usuario.empresas) {
              nomeEmpresa =
                usuario.empresas.nome ||
                "Labor";
            }

            return `
              <tr>

                <td>
                  <strong>
                    ${escaparHtml(usuario.nome)}
                  </strong>
                </td>

                <td>
                  ${escaparHtml(usuario.usuario)}
                </td>

                <td>
                  ${escaparHtml(nomeEmpresa)}
                </td>

                <td>
                  ${escaparHtml(
                    formatarPerfil(usuario.perfil)
                  )}
                </td>

                <td>
                  ${
                    usuario.ativo
                      ? `
                        <span class="admin-status admin-status-ativa">
                          Ativo
                        </span>
                      `
                      : `
                        <span class="admin-status admin-status-inativa">
                          Inativo
                        </span>
                      `
                  }
                </td>

                <td>
                  <button
                    type="button"
                    class="admin-btn-editar"
                    onclick="editarUsuario(${Number(usuario.id)})"
                  >
                    Editar
                  </button>
                </td>

              </tr>
            `;
          }).join("")}

        </tbody>

      </table>

    </div>
  `;
}

async function garantirEmpresasParaUsuario() {
  if (empresasCarregadas.length) {
    preencherEmpresasUsuario();
    return;
  }

  const resposta = await fetch("/api/empresas");
  const empresas = await resposta.json();

  if (!resposta.ok) {
    throw new Error(
      empresas.erro ||
      "Erro ao carregar empresas."
    );
  }

  empresasCarregadas =
    Array.isArray(empresas) ? empresas : [];

  preencherEmpresasUsuario();
}

function preencherEmpresasUsuario() {
  const campo =
    document.getElementById("usuarioEmpresa");

  if (!campo) {
    return;
  }

  campo.innerHTML = `
    <option value="">
      Selecione
    </option>

    ${empresasCarregadas
      .filter(empresa => empresa.ativo !== false)
      .map(empresa => `
        <option value="${Number(empresa.id)}">
          ${escaparHtml(empresa.nome)}
        </option>
      `)
      .join("")}
  `;
}

async function novoUsuario() {
  try {
    await garantirEmpresasParaUsuario();

    document
      .getElementById("formUsuario")
      .reset();

    document.getElementById("usuarioId").value = "";

    document.getElementById("usuarioPerfil").value =
      "cliente_admin";

    document.getElementById("usuarioAtivo").checked =
      true;

    document.getElementById(
      "tituloModalUsuario"
    ).textContent = "Novo Usuário";

    document.getElementById(
      "modalUsuario"
    ).style.display = "flex";

  } catch (erro) {
    alert(
      "Não foi possível abrir o cadastro: " +
      erro.message
    );
  }
}

async function editarUsuario(id) {
  const usuario = usuariosCarregados.find(
    item => Number(item.id) === Number(id)
  );

  if (!usuario) {
    return;
  }

  try {
    await garantirEmpresasParaUsuario();

    document.getElementById("usuarioId").value =
      usuario.id;

    document.getElementById("usuarioNome").value =
      usuario.nome || "";

    document.getElementById("usuarioLogin").value =
      usuario.usuario || "";

    document.getElementById("usuarioEmpresa").value =
      usuario.empresa_id || "";

    document.getElementById("usuarioPerfil").value =
      usuario.perfil || "cliente_admin";

    document.getElementById("usuarioSenha").value =
      "";

    document.getElementById("usuarioAtivo").checked =
      usuario.ativo !== false;

    document.getElementById(
      "tituloModalUsuario"
    ).textContent = "Editar Usuário";

    document.getElementById(
      "modalUsuario"
    ).style.display = "flex";

  } catch (erro) {
    alert(
      "Não foi possível editar o usuário: " +
      erro.message
    );
  }
}

function fecharModalUsuario() {
  document.getElementById(
    "modalUsuario"
  ).style.display = "none";
}

async function salvarUsuario(evento) {
  evento.preventDefault();

  const idTexto =
    document.getElementById("usuarioId").value;

  const id =
    idTexto ? Number(idTexto) : null;

  const empresaTexto =
    document.getElementById("usuarioEmpresa").value;

  const empresaId =
    empresaTexto
      ? Number(empresaTexto)
      : null;

  const dados = {
    nome:
      document
        .getElementById("usuarioNome")
        .value
        .trim(),

    usuario:
      document
        .getElementById("usuarioLogin")
        .value
        .trim()
        .toLowerCase(),

    empresa_id:
      empresaId,

    perfil:
      document.getElementById(
        "usuarioPerfil"
      ).value,

    senha:
      document.getElementById(
        "usuarioSenha"
      ).value,

    ativo:
      document.getElementById(
        "usuarioAtivo"
      ).checked
  };

  if (id) {
    dados.id = id;
  }

  if (!dados.nome) {
    alert("Informe o nome.");
    return;
  }

  if (!dados.usuario) {
    alert("Informe o usuário.");
    return;
  }

  if (
    dados.perfil !== "super_admin" &&
    !dados.empresa_id
  ) {
    alert("Selecione a empresa.");
    return;
  }

  if (!id && !dados.senha) {
    alert(
      "Informe uma senha para o novo usuário."
    );

    return;
  }

  const botao =
    document.getElementById(
      "botaoSalvarUsuario"
    );

  botao.disabled = true;
  botao.innerText = "Salvando...";

  try {
    const resposta = await fetch(
      "/api/usuarios",
      {
        method: id ? "PATCH" : "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify(dados)
      }
    );

    const resultado =
      await resposta.json();

    if (!resposta.ok) {
      throw new Error(
        resultado.erro ||
        "Erro ao salvar usuário."
      );
    }

    alert(
      id
        ? "Usuário atualizado com sucesso."
        : "Usuário criado com sucesso."
    );

    fecharModalUsuario();

    await carregarUsuarios();

  } catch (erro) {
    alert(
      "Não foi possível salvar o usuário: " +
      erro.message
    );

    console.error(erro);

  } finally {
    botao.disabled = false;
    botao.innerText = "Salvar Usuário";
  }
}

/* =========================================================
   DASHBOARD DO SUPER ADMIN
   ========================================================= */

async function carregarDashboardSaas() {
  if (
    usuarioLogado?.perfil !==
    "super_admin"
  ) {
    return;
  }

  try {
    const [
      respostaEmpresas,
      respostaUsuarios
    ] = await Promise.all([
      fetch("/api/empresas"),
      fetch("/api/usuarios")
    ]);

    const empresas =
      await respostaEmpresas.json();

    const usuarios =
      await respostaUsuarios.json();

    if (
      !respostaEmpresas.ok ||
      !respostaUsuarios.ok
    ) {
      return;
    }

    empresasCarregadas =
      Array.isArray(empresas)
        ? empresas
        : [];

    usuariosCarregados =
      Array.isArray(usuarios)
        ? usuarios
        : [];

    const empresasAtivas =
      empresasCarregadas.filter(
        e =>
          e.ativo !== false &&
          e.bloqueada !== true
      );

    const usuariosAtivos =
      usuariosCarregados.filter(
        u => u.ativo !== false
      );

    document.getElementById(
      "kpiEmpresas"
    ).textContent =
      empresasCarregadas.length;

    document.getElementById(
      "kpiEmpresasAtivas"
    ).textContent =
      empresasAtivas.length;

    document.getElementById(
      "kpiUsuarios"
    ).textContent =
      usuariosCarregados.length;

    document.getElementById(
      "kpiUsuariosAtivos"
    ).textContent =
      usuariosAtivos.length;

    montarDashboardEmpresas();

  } catch (erro) {
    console.error(
      "Erro no dashboard SaaS:",
      erro
    );
  }
}

function montarDashboardEmpresas() {
  const area =
    document.getElementById(
      "dashboardEmpresas"
    );

  if (!area) {
    return;
  }

  const linhas =
    empresasCarregadas
      .map(empresa => {

        const denunciasEmpresa =
          denunciasCarregadas.filter(
            d =>
              Number(d.empresa_id) ===
              Number(empresa.id)
          );

        const abertas =
          denunciasEmpresa.filter(
            d =>
              ![
                "Concluída",
                "Arquivada"
              ].includes(
                d.status ||
                "Recebida"
              )
          ).length;

        const criticas =
          denunciasEmpresa.filter(
            d =>
              d.urgencia ===
              "Crítica"
          ).length;

        return {
          nome: empresa.nome,
          total:
            denunciasEmpresa.length,
          abertas,
          criticas
        };
      })
      .sort(
        (a, b) =>
          b.total - a.total
      );

  area.innerHTML = `
    <div class="dashboard-empresa-linha">
      <div>Empresa</div>
      <div>Total</div>
      <div>Abertas</div>
      <div>Críticas</div>
    </div>

    ${linhas.map(item => `
      <div class="dashboard-empresa-linha">

        <div>
          <strong>
            ${escaparHtml(item.nome)}
          </strong>
        </div>

        <div>
          ${item.total}
        </div>

        <div>
          ${item.abertas}
        </div>

        <div>
          ${item.criticas}
        </div>

      </div>
    `).join("")}
  `;
}

/* =========================================================
   EVENTOS
   ========================================================= */

document
  .getElementById("loginForm")
  .addEventListener("submit", evento => {
    evento.preventDefault();
    fazerLogin();
  });

document
  .getElementById("botaoNovaEmpresa")
  .addEventListener("click", novaEmpresa);

document
  .getElementById("botaoNovoUsuario")
  .addEventListener("click", novoUsuario);

document
  .getElementById("formEmpresa")
  .addEventListener("submit", salvarEmpresa);

document
  .getElementById("formUsuario")
  .addEventListener("submit", salvarUsuario);

document
  .getElementById("empresaCodigo")
  .addEventListener("input", atualizarPreviewLink);

document.addEventListener("DOMContentLoaded", () => {
  const salvo =
    sessionStorage.getItem("usuarioPainel");

  if (!salvo) {
    abrirLogin();
    return;
  }

  try {
    usuarioLogado = JSON.parse(salvo);
    abrirPainel();

  } catch (erro) {
    console.error(erro);
    abrirLogin();
  }
});
