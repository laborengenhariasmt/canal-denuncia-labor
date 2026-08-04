function obterEmpresaCodigo() {
  const parametros = new URLSearchParams(
    window.location.search
  );

  return String(parametros.get("empresa") || "")
    .trim()
    .toLowerCase();
}

document
  .getElementById("consultaForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const empresaCodigo = obterEmpresaCodigo();

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
      if (!empresaCodigo) {
        throw new Error(
          "Empresa não identificada no endereço."
        );
      }

      const parametros = new URLSearchParams({
        empresa: empresaCodigo,
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
            ${dados.protocolo}
          </p>

          <p>
            <strong>Status atual:</strong>
            ${dados.status}
          </p>

          <p>
            <strong>Registrado em:</strong>
            ${dataRegistro}
          </p>

          <p>
            <strong>Última atualização:</strong>
            ${dataAtualizacao}
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
          <p>${erro.message}</p>
        </div>
      `;

    } finally {
      botao.disabled = false;
      botao.innerText = "Consultar protocolo";
    }
  });
