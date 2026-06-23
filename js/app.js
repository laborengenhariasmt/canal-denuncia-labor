const SUPABASE_URL = "COLE_AQUI_SUA_SUPABASE_URL";
const SUPABASE_ANON_KEY = "COLE_AQUI_SUA_ANON_PUBLIC_KEY";

function gerarProtocolo() {
  const ano = new Date().getFullYear();
  const numero = Math.floor(100000 + Math.random() * 900000);
  return `LABOR-${ano}-${numero}`;
}

document.querySelectorAll('input[name="anonimo"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    const identificado = document.querySelector('input[name="anonimo"]:checked').value === "nao";
    document.getElementById("dadosIdentificacao").style.display = identificado ? "grid" : "none";
  });
});

document.getElementById("denunciaForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const identificado = document.querySelector('input[name="anonimo"]:checked').value === "nao";
  const protocolo = gerarProtocolo();

  const dados = {
    protocolo: protocolo,
    tipo_denuncia: document.getElementById("tipo_denuncia").value,
    urgencia: document.getElementById("urgencia").value,
    local_ocorrencia: document.getElementById("local_ocorrencia").value,
    setor: document.getElementById("setor").value,
    data_ocorrencia: document.getElementById("data_ocorrencia").value || null,
    denuncia_anonima: !identificado,
    nome_denunciante: identificado ? document.getElementById("nome").value : null,
    email_denunciante: identificado ? document.getElementById("email").value : null,
    telefone_denunciante: identificado ? document.getElementById("telefone").value : null,
    descricao: document.getElementById("descricao").value,
    pessoas_envolvidas: document.getElementById("pessoas_envolvidas").value,
    testemunhas: document.getElementById("testemunhas").value,
    status: "Recebida",
    gravidade: "A classificar"
  };

  try {
    const resposta = await fetch(`${SUPABASE_URL}/rest/v1/denuncias`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "Prefer": "return=minimal"
      },
      body: JSON.stringify(dados)
    });

    if (!resposta.ok) {
      throw new Error("Erro ao registrar denúncia.");
    }

    alert(`Denúncia registrada com sucesso.\n\nProtocolo: ${protocolo}\n\nGuarde este número.`);
    document.getElementById("denunciaForm").reset();
    document.getElementById("dadosIdentificacao").style.display = "none";

  } catch (erro) {
    alert("Não foi possível registrar a denúncia. Verifique a conexão ou tente novamente.");
    console.error(erro);
  }
});
