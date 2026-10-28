'use strict';
/* ===== Inicializacao do Hub =====
   - Hospedado (Vercel + Supabase configurados em /api/config): exige LOGIN antes de carregar o app. Depois do login busca,
     no Supabase, o papel do usuario (tabela perfis) e a biblioteca de videos compartilhada (midias_compartilhadas).
   - Local (duplo clique no index.html, sem /api/config): abre direto, como antes.
   Os dados publicos (catalogos Movida/Localiza e videos sugeridos) continuam vindo dos arquivos em data/. */
(function () {
  const BASE = ['data/catalogo-localiza.js', 'data/catalogo-movida.js', 'data/fichas-tecnicas.js', 'data/videos-sugeridos.js'];
  const APP = ['js/core.js', 'js/nuvem.js', 'js/clove.js', 'js/views.js', 'js/admin.js', 'js/main.js'];
  const SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';

  const script = src => new Promise(ok => { const s = document.createElement('script'); s.src = src; s.async = false; s.onload = () => ok(true); s.onerror = () => ok(false); document.head.appendChild(s); });
  const seq = async lista => { for (const s of lista) await script(s); };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  async function configuracao() {
    try {
      const r = await fetch('/api/config', { cache: 'no-store' });
      if (!r.ok) return null;
      const j = await r.json();
      return j && j.supabaseUrl && j.supabaseAnonKey ? j : null;
    } catch (e) { return null; }
  }

  function estilo() {
    const st = document.createElement('style');
    st.textContent = `.login-bg{position:fixed;inset:0;z-index:500;display:grid;place-items:center;background:var(--bg,#08090C);padding:16px}
.login-card{width:100%;max-width:380px;background:var(--panel,#0F1116);border:1px solid var(--line2,rgba(255,255,255,.16));border-radius:var(--r,16px);padding:28px;box-shadow:var(--sh2,none)}
.login-card h1{font-size:20px;margin:0 0 4px}.login-card p{margin:0 0 18px;color:var(--muted,#9AA2B4);font-size:13px}
.login-card label{display:block;font-size:12px;color:var(--muted,#9AA2B4);margin:12px 0 4px}
.login-card input{width:100%;padding:10px 12px;border-radius:10px;border:1px solid var(--line2,rgba(255,255,255,.16));background:var(--panel2,#151821);color:var(--text,#F2F4F8)}
.login-card button{width:100%;margin-top:18px;padding:11px;border:0;border-radius:10px;background:var(--blue,#2F6BFF);color:#fff;font-weight:600;cursor:pointer}
.login-card button[disabled]{opacity:.6;cursor:wait}.login-err{color:var(--bad,#FF6B7A);font-size:13px;margin-top:12px;min-height:18px}
#dryveConta{position:fixed;right:12px;bottom:12px;z-index:90;display:flex;gap:8px}
#dryveConta button{background:var(--panel,#0F1116);border:1px solid var(--line2,rgba(255,255,255,.16));color:var(--muted,#9AA2B4);border-radius:99px;padding:6px 12px;font-size:12px;cursor:pointer}
#dryveConta button:hover{color:#fff}`;
    document.head.appendChild(st);
  }

  function telaLogin(sb) {
    return new Promise(resolve => {
      const bg = document.createElement('div'); bg.className = 'login-bg';
      bg.innerHTML = `<form class="login-card" id="dryveLogin" novalidate><h1>Dryve Assinatura Hub</h1><p>Entre com o e-mail e a senha cadastrados pela administração.</p>
        <label for="lgEmail">E-mail</label><input id="lgEmail" type="email" autocomplete="username" required>
        <label for="lgSenha">Senha</label><input id="lgSenha" type="password" autocomplete="current-password" required>
        <button type="submit">Entrar</button><div class="login-err" id="lgErr" role="alert"></div></form>`;
      document.body.appendChild(bg);
      const f = bg.querySelector('form'), err = bg.querySelector('#lgErr'), btn = bg.querySelector('button');
      bg.querySelector('#lgEmail').focus();
      f.addEventListener('submit', async e => {
        e.preventDefault(); err.textContent = ''; btn.disabled = true;
        const email = f.lgEmail.value.trim(), password = f.lgSenha.value;
        if (!email || !password) { err.textContent = 'Informe e-mail e senha.'; btn.disabled = false; return; }
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        btn.disabled = false;
        if (error || !data.session) { err.textContent = 'E-mail ou senha incorretos.'; return; }
        bg.remove(); resolve(data.session);
      });
    });
  }

  function falhaFatal(msg) {
    estilo();
    const bg = document.createElement('div'); bg.className = 'login-bg';
    bg.innerHTML = `<div class="login-card"><h1>Não foi possível abrir o Hub</h1><p>${esc(msg)}</p></div>`;
    document.body.appendChild(bg);
  }

  async function hospedado(cfg) {
    estilo();
    if (!(await script(SUPABASE_JS)) || !window.supabase) return falhaFatal('Não consegui carregar o componente de login. Verifique a conexão e recarregue a página.');
    const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true } });
    let { data: { session } } = await sb.auth.getSession();
    if (!session) session = await telaLogin(sb);
    const user = session.user;
    const [perfil, nuvem] = await Promise.all([
      sb.from('perfis').select('papel').eq('id', user.id).maybeSingle(),
      sb.from('midias_compartilhadas').select('*').order('criado_em', { ascending: true }).range(0, 4999)
    ]);
    window.DRYVE = {
      email: user.email,
      papel: perfil.data && perfil.data.papel === 'admin' ? 'admin' : 'atendente',
      sb,
      midiasNuvem: nuvem.error ? null : (nuvem.data || []),   // null = tabela ainda nao criada (rode supabase/midias.sql)
      token: async () => { const { data } = await sb.auth.getSession(); return data.session ? data.session.access_token : null; },
      sair: async () => { await sb.auth.signOut(); location.reload(); }
    };
    sb.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_OUT') location.reload(); });
    const conta = document.createElement('div'); conta.id = 'dryveConta';
    const senha = document.createElement('button'); senha.id = 'dryveSenha'; senha.type = 'button'; senha.textContent = 'Trocar senha';
    senha.addEventListener('click', async () => {
      const nova = window.prompt('Nova senha (mínimo 10 caracteres):');
      if (nova === null) return;
      if (nova.length < 10) return window.alert('A senha precisa ter pelo menos 10 caracteres.');
      const { error } = await sb.auth.updateUser({ password: nova });
      window.alert(error ? 'Não foi possível trocar a senha: ' + error.message : 'Senha alterada.');
    });
    const sair = document.createElement('button'); sair.id = 'dryveSair'; sair.type = 'button'; sair.textContent = user.email + ' · Sair';
    sair.addEventListener('click', () => window.DRYVE.sair());
    conta.append(senha, sair); document.body.appendChild(conta);
    await seq([...BASE, ...APP]);
  }

  (async function iniciar() {
    const cfg = await configuracao();
    if (cfg) return hospedado(cfg);
    await seq([...BASE, ...APP]);   // modo local
  })();
})();
