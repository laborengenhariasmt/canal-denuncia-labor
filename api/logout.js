import {
  criarCookieLogout
} from "../lib/session.js";

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      erro: "Método não permitido."
    });
  }

  res.setHeader(
    "Set-Cookie",
    criarCookieLogout()
  );

  return res.status(200).json({
    sucesso: true
  });
}
