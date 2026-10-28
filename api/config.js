'use strict';
/* Entrega ao navegador a configuracao PUBLICA do Supabase (URL + chave anon, que sao feitas para ficar no navegador).
   Se nao estiver configurado, devolve 404 e o Hub abre em modo local (sem login), como a versao de duplo clique.
   NUNCA coloque aqui a service_role. */
module.exports = function handler(req, res) {
  const url = process.env.SUPABASE_URL, anon = process.env.SUPABASE_ANON_KEY;
  res.setHeader('Cache-Control', 'no-store');
  if (!url || !anon) { res.statusCode = 404; res.setHeader('Content-Type', 'application/json'); return res.end('{"hospedado":false}'); }
  res.statusCode = 200; res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ hospedado: true, supabaseUrl: url, supabaseAnonKey: anon }));
};
