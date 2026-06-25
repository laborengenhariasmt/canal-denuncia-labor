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
    const turnstileToken = turnstile.getResponse();

  if (!turnstileToken) {
    alert("Confirme o captcha.");
    return;
  }
  
  const resposta = await fetch("/api/registrar-denuncia", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      ...dados,
      turnstileToken
    })
  });

    if (!resposta.ok) {
      const erro = await resposta.json();
      throw new Error(erro.erro || "Erro ao registrar denúncia.");
    }

    alert(`Denúncia registrada com sucesso.\n\nProtocolo: ${protocolo}\n\nGuarde este número.`);
    document.getElementById("denunciaForm").reset();
    document.getElementById("dadosIdentificacao").style.display = "none";

  } catch (erro) {
  alert(erro.message);
  console.error(erro);
  }
});
