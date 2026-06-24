export default async function handler(req, res) {
  const cookie = req.headers.cookie || "";

  if (!cookie.includes(`labor_session=${process.env.SESSION_TOKEN}`)) {
    return res.status(401).json({ erro: "Não autorizado" });
  }

  if (req.method !== "GET") {
    return res.status(405).json({ erro: "Método não permitido" });
  }

  try {
    const resposta = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/denuncias?select=*&order=criado_em.desc`,
      {
        method: "GET",
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    );

    const dados = await resposta.json();

    if (!resposta.ok) {
      return res.status(resposta.status).json(dados);
    }

    return res.status(200).json(dados);

  } catch (erro) {
    return res.status(500).json({ erro: "Erro interno ao consultar denúncias" });
  }
}
