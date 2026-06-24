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

    if (denuncias.length === 0) {
      area.innerHTML = "<p>Nenhuma denúncia registrada até o momento.</p>";
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
