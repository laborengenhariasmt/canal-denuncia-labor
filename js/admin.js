let denunciasCarregadas = [];

async function fazerLogin() {
  const usuario = document.getElementById("usuario").value.trim();
  const senha = document.getElementById("senha").value.trim();

  const resposta = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usuario, senha })
  });

  if (resposta.ok) {
    document.getElementById("loginCard").style.display = "none";
    document.getElementById("painelCard").style.display = "block";
    carregarDenuncias();
  } else {
    document.getElementById("erroLogin").innerText = "Usuário ou senha inválidos.";
  }
}

function sair() {
  document.getElementById("loginCard").style.display = "block";
  document.getElementById("painelCard").style.display = "none";
}

async function carregarDenuncias() {
  const area = document.getElementById("listaDenuncias");
  area.innerHTML = "Carregando denúncias...";

  try {
    const resposta = await fetch("/api/denuncias");

    if (!resposta.ok) throw new Error("Erro ao carregar denúncias.");

    const denuncias = await resposta.json();
    denunciasCarregadas = denuncias;

    montarResumo(denuncias);
    renderizarDenuncias(denuncias);

  } catch (erro) {
    console.error(erro);
    area.innerHTML = "<p>Erro ao carregar denúncias. Faça login novamente.</p>";
  }
}

function aplicarFiltroStatus() {
  const status = document.getElementById("filtroStatus").value;

  if (status === "Todos") {
    renderizarDenuncias(denunciasCarregadas);
    return;
  }

  const filtradas = denunciasCarregadas.filter(d => (d.status || "Recebida") === status);
  renderizarDenuncias(filtradas);
}

function montarResumo(denuncias) {
  const total = denuncias.length;
  const recebidas = denuncias.filter(d => d.status === "Recebida" || !d.status).length;
  const emAnalise = denuncias.filter(d => d.status === "Em análise").length;
  const emInvestigacao = denuncias.filter(d => d.status === "Em investigação").length;
  const concluidas = denuncias.filter(d => d.status === "Concluída").length;
  const arquivadas = denuncias.filter(d => d.status === "Arquivada").length;

  document.getElementById("resumoDenuncias").innerHTML = `
    <div class="resumo-card"><strong>${total}</strong><span>Total</span></div>
    <div class="resumo-card"><strong>${recebidas}</strong><span>Recebidas</span></div>
    <div class="resumo-card"><strong>${emAnalise}</strong><span>Em análise</span></div>
    <div class="resumo-card"><strong>${emInvestigacao}</strong><span>Em investigação</span></div>
    <div class="resumo-card"><strong>${concluidas}</strong><span>Concluídas</span></div>
    <div class="resumo-card"><strong>${arquivadas}</strong><span>Arquivadas</span></div>
  `;
}

function prioridadeIcone(urgencia) {
  if (urgencia === "Crítica") return "🔴";
  if (urgencia === "Alta") return "🟠";
  if (urgencia === "Média") return "🟡";
  return "🟢";
}

function renderizarDenuncias(denuncias) {
  const area = document.getElementById("listaDenuncias");

  if (denuncias.length === 0) {
    area.innerHTML = "<p>Nenhuma denúncia encontrada para este filtro.</p>";
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
              <td>${d.protocolo}</td>
              <td>${new Date(d.criado_em).toLocaleDateString("pt-BR")}</td>
              <td>${d.tipo_denuncia}</td>
              <td>${prioridadeIcone(d.urgencia)} ${d.urgencia}</td>
              <td>${d.status || "Recebida"}</td>
              <td>
                <button class="btn-pequeno" onclick="abrirDetalhes(${d.id})">Abrir</button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function abrirDetalhes(id) {
  const d = denunciasCarregadas.find(item => item.id === id);

  if (!d) return;

  document.getElementById("modalDetalhes").style.display = "flex";

  document.getElementById("conteudoDetalhes").innerHTML = `
    <h2>${d.protocolo}</h2>

    <p><strong>Data:</strong> ${new Date(d.criado_em).toLocaleString("pt-BR")}</p>
    <p><strong>Tipo:</strong> ${d.tipo_denuncia}</p>
    <p><strong>Urgência:</strong> ${prioridadeIcone(d.urgencia)} ${d.urgencia}</p>
    <p><strong>Setor:</strong> ${d.setor || "Não informado"}</p>
    <p><strong>Local:</strong> ${d.local_ocorrencia || "Não informado"}</p>
    <p><strong>Status atual:</strong> ${d.status || "Recebida"}</p>

    <label>Alterar Status</label>
    <select id="statusDetalhe">
      <option ${!d.status || d.status === "Recebida" ? "selected" : ""}>Recebida</option>
      <option ${d.status === "Em análise" ? "selected" : ""}>Em análise</option>
      <option ${d.status === "Em investigação" ? "selected" : ""}>Em investigação</option>
      <option ${d.status === "Concluída" ? "selected" : ""}>Concluída</option>
      <option ${d.status === "Arquivada" ? "selected" : ""}>Arquivada</option>
    </select>

    <button onclick="salvarStatusDetalhe(${d.id})">Salvar Status</button>

    <hr>

    <h3>Descrição</h3>
    <p>${d.descricao || "Não informada"}</p>

    <h3>Pessoas Envolvidas</h3>
    <p>${d.pessoas_envolvidas || "Não informado"}</p>

    <h3>Testemunhas</h3>
    <p>${d.testemunhas || "Não informado"}</p>

    <h3>Identificação</h3>
    <p><strong>Anônima:</strong> ${d.denuncia_anonima ? "Sim" : "Não"}</p>
    <p><strong>Nome:</strong> ${d.nome_denunciante || "Não informado"}</p>
    <p><strong>E-mail:</strong> ${d.email_denunciante || "Não informado"}</p>
    <p><strong>Telefone:</strong> ${d.telefone_denunciante || "Não informado"}</p>
  `;
}

function fecharDetalhes() {
  document.getElementById("modalDetalhes").style.display = "none";
}

async function salvarStatusDetalhe(id) {
  const status = document.getElementById("statusDetalhe").value;
  await atualizarStatus(id, status);
  fecharDetalhes();
}

async function atualizarStatus(id, status) {
  const resposta = await fetch("/api/atualizar-status", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, status })
  });

  if (resposta.ok) {
    carregarDenuncias();
  } else {
    alert("Erro ao atualizar status.");
  }
}
