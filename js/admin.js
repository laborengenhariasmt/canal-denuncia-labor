let denunciasCarregadas = [];
async function fazerLogin() {
  const usuario = document.getElementById("usuario").value.trim();
  const senha = document.getElementById("senha").value.trim();

  const resposta = await fetch("/api/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
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

    if (!resposta.ok) {
      throw new Error("Erro ao carregar denúncias.");
    }

    const denuncias = await resposta.json();
    denunciasCarregadas = denuncias;
    montarResumo(denuncias);
    
    renderizarDenuncias(denuncias);
    return; `
      <div class="aviso">
        <strong>Protocolo:</strong> ${d.protocolo}<br>
        <strong>Data:</strong> ${new Date(d.criado_em).toLocaleString("pt-BR")}<br>
        <strong>Tipo:</strong> ${d.tipo_denuncia}<br>
        <strong>Urgência:</strong> ${d.urgencia}<br>
        <strong>Setor:</strong> ${d.setor || "Não informado"}<br>
        <strong>Status:</strong> ${d.status || "Recebida"}<br>

        <select onchange="atualizarStatus(${d.id}, this.value)">
          <option ${d.status === "Recebida" ? "selected" : ""}>Recebida</option>
          <option ${d.status === "Em análise" ? "selected" : ""}>Em análise</option>
          <option ${d.status === "Em investigação" ? "selected" : ""}>Em investigação</option>
          <option ${d.status === "Concluída" ? "selected" : ""}>Concluída</option>
          <option ${d.status === "Arquivada" ? "selected" : ""}>Arquivada</option>
        </select>
        
        <br><br>

        <strong>Descrição:</strong><br>
        ${d.descricao || "Não informada"}<br><br>

        <strong>Pessoas envolvidas:</strong><br>
        ${d.pessoas_envolvidas || "Não informado"}<br><br>

        <strong>Testemunhas:</strong><br>
        ${d.testemunhas || "Não informado"}
      </div>
    `).join("");

  } catch (erro) {
    console.error(erro);
    area.innerHTML = "<p>Erro ao carregar denúncias. Faça login novamente.</p>";
  }
}
async function atualizarStatus(id, status) {
  const resposta = await fetch("/api/atualizar-status", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ id, status })
  });

  if (resposta.ok) {
    alert("Status atualizado.");
    carregarDenuncias();
  } else {
    alert("Erro ao atualizar status.");
  }
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
function aplicarFiltroStatus() {
  const status = document.getElementById("filtroStatus").value;

  if (status === "Todos") {
    renderizarDenuncias(denunciasCarregadas);
    return;
  }

  const filtradas = denunciasCarregadas.filter(d => (d.status || "Recebida") === status);
  renderizarDenuncias(filtradas);
}

function renderizarDenuncias(denuncias) {
  const area = document.getElementById("listaDenuncias");

  if (denuncias.length === 0) {
    area.innerHTML = "<p>Nenhuma denúncia encontrada para este filtro.</p>";
    return;
  }

  area.innerHTML = denuncias.map(d => `
      <div class="aviso">
        <strong>Protocolo:</strong> ${d.protocolo}<br>
        <strong>Data:</strong> ${new Date(d.criado_em).toLocaleString("pt-BR")}<br>
        <strong>Tipo:</strong> ${d.tipo_denuncia}<br>
        <strong>Urgência:</strong> ${d.urgencia}<br>
        <strong>Setor:</strong> ${d.setor || "Não informado"}<br>
        <strong>Status:</strong> ${d.status || "Recebida"}<br>

        <select onchange="atualizarStatus(${d.id}, this.value)">
          <option ${d.status === "Recebida" ? "selected" : ""}>Recebida</option>
          <option ${d.status === "Em análise" ? "selected" : ""}>Em análise</option>
          <option ${d.status === "Em investigação" ? "selected" : ""}>Em investigação</option>
          <option ${d.status === "Concluída" ? "selected" : ""}>Concluída</option>
          <option ${d.status === "Arquivada" ? "selected" : ""}>Arquivada</option>
        </select>

        <br><br>

        <strong>Descrição:</strong><br>
        ${d.descricao || "Não informada"}<br><br>

        <strong>Pessoas envolvidas:</strong><br>
        ${d.pessoas_envolvidas || "Não informado"}<br><br>

        <strong>Testemunhas:</strong><br>
        ${d.testemunhas || "Não informado"}
      </div>
    `).join("");
}
