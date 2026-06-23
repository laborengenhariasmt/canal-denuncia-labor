const SUPABASE_URL = "COLE_AQUI_SUA_SUPABASE_URL";
const SUPABASE_ANON_KEY = "COLE_AQUI_SUA_ANON_PUBLIC_KEY";

async function carregarDenuncias() {
  const area = document.getElementById("listaDenuncias");
  area.innerHTML = "Carregando denúncias...";

  try {
    const resposta = await fetch(`${SUPABASE_URL}/rest/v1/denuncias?select=*&order=criado_em.desc`, {
      method: "GET",
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

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
        <strong>Status:</strong> ${d.status || "Recebida"}<br><br>

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
    area.innerHTML = "<p>Erro ao carregar denúncias.</p>";
  }
}

carregarDenuncias();
