'use strict';
/* ===== navegação ===== */
const NAV = [['/', 'Visão geral', 'home'], ['/catalogo', 'Catálogo de veículos', 'car'], ['/locadoras', 'Locadoras', 'building'], ['/biblioteca', 'Biblioteca de vídeos', 'video'], ['/clientes', 'Clientes e retiradas', 'users'], ['/mensagens', 'Materiais de atendimento', 'message'], ['/clove', 'Clove Assistente', 'sparkles'], ['/favoritos', 'Favoritos', 'star'], ['/admin', 'Administração', 'sliders']];
let ultimoVeic = null;
const TITULOS = { '': 'Home', catalogo: 'Catálogo', veiculo: 'Ficha do veículo', locadoras: 'Locadoras', locadora: 'Locadora', biblioteca: 'Biblioteca', midia: 'Biblioteca', clientes: 'Clientes e retiradas', mensagens: 'Materiais de atendimento', clove: 'Clove Assistente', favoritos: 'Favoritos', admin: 'Administração' };
function aplicarRail() { let r = true; try { r = localStorage.getItem('dh_rail') !== '0'; } catch (e) { } $('#app').classList.toggle('rail', r); }
function saudacao() { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; }

function desenharShell() {
  $('#nav').innerHTML = NAV.map(([p, n, i]) => `<a href="#${p}" data-p="${p}">${ico(i)}<span>${n}</span>${p === '/admin' && !isAdmin() ? ico('lock', 'sm') : ''}${p === '/favoritos' && S.favoritos.veiculos.length + S.favoritos.midias.length ? `<span class="cnt">${S.favoritos.veiculos.length + S.favoritos.midias.length}</span>` : ''}</a>`).join('');
  $('#railBtn').innerHTML = ico('chevron', 'sm');
  aplicarRail();
  $('#menuBtn').innerHTML = ico('menu'); $('#gsIco').innerHTML = ico('search', 'sm');
  $('#btnRecentes').innerHTML = `${ico('clock', 'sm')}<span class="lbl">Recentes</span>`;
  $('#btnClove').innerHTML = `${ico('sparkles', 'sm')}<span class="lbl">Clove</span>`;
  const nome = S.config.usuario || 'Usuário';
  $('#userBtn').innerHTML = `<span class="avatar">${esc(nome.split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase())}</span><span class="t">${esc(nome)}<small>${isAdmin() ? 'Administrador' : 'Atendente'}</small></span>`;
}

function rota() {
  const h = location.hash.slice(1) || '/', [path, qs] = h.split('?');
  return { segs: path.split('/').filter(Boolean), params: new URLSearchParams(qs || ''), qs: qs || '' };
}
function rotear() {
  const { segs, params, qs } = rota(), [a, b] = segs, view = $('#view');
  fecharPops(); $('#side').classList.remove('open'); $('#scrim').classList.remove('open');
  if (a !== 'veiculo') ultimoVeic = null;
  let html = '', pos = null;
  try {
    switch (a) {
      case undefined: html = viewHome(); break;
      case 'catalogo': html = viewCatalogo(qs ? params : null); pos = pintarCatalogo; break;
      case 'veiculo':
        if (ultimoVeic !== b) { ultimoVeic = b; fichaTab = 'fotos'; planoSel = 0; registrarVeiculo(b); }
        html = viewVeiculo(b); break;
      case 'locadoras': html = viewLocadoras(); break;
      case 'locadora': html = viewLocadora(b); break;
      case 'biblioteca': html = viewBiblioteca(qs ? params : null); pos = pintarBiblioteca; break;
      case 'midia': html = viewBiblioteca(); pos = () => { pintarBiblioteca(); if (midia(b)) abrirViewer(b); else toast('Material não encontrado neste navegador.', 'err'); }; break;
      case 'clientes': html = viewClientes(); pos = posClientes; break;
      case 'mensagens': html = viewMensagens(qs ? params : null); pos = pintarMensagens; break;
      case 'clove': html = viewClove(qs ? params : null); pos = () => { const l = $('#chatLog'); l.scrollTop = l.scrollHeight; }; break;
      case 'favoritos': html = viewFavoritos(); break;
      case 'admin': html = viewAdmin(b || 'veiculos'); pos = () => posAdmin(b || 'veiculos'); break;
      default: html = vazio('search', 'Página não encontrada', '', '<a class="btn primary" href="#/">Ir para a visão geral</a>');
    }
    view.innerHTML = html; if (pos) pos();
  } catch (err) {
    console.error(err);
    view.innerHTML = vazio('alert', 'Algo deu errado ao abrir esta tela', esc(err.message), '<a class="btn primary" href="#/">Voltar ao início</a>');
  }
  desenharShell();
  $('#pTitle').textContent = TITULOS[a || ''] || 'Hub'; $('#pDate').textContent = cap(new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
  const cur = '/' + (a || ''); $$('#nav a').forEach(x => x.classList.toggle('on', x.dataset.p === cur || (a === 'veiculo' && x.dataset.p === '/catalogo') || (a === 'locadora' && x.dataset.p === '/locadoras') || (a === 'midia' && x.dataset.p === '/biblioteca')));
  hidratar(view); if (!(a === 'midia')) window.scrollTo(0, 0);
}

function posClientes() {
  pintarClientes();
  const d = $('#cliDrop'); if (!d) return;
  d.ondragover = e => { e.preventDefault(); d.classList.add('drag'); }; d.ondragleave = () => d.classList.remove('drag');
  d.ondrop = e => { e.preventDefault(); e.stopPropagation(); d.classList.remove('drag'); const fs = [...e.dataTransfer.files].filter(f => tipoDe(f.name) === 'video'); if (!fs.length) return toast('Solte arquivos de vídeo (mp4, mov, webm).', 'err'); const dt = new DataTransfer(); fs.forEach(f => dt.items.add(f)); abrirFormMidia(null, { cliente: true, arquivos: dt.files }); };
}
function posAdmin(tab) {
  if (tab === 'dados' && navigator.storage?.estimate) navigator.storage.estimate().then(e => { const el = $('#storageInfo'); if (el) el.textContent = `Usando ${(e.usage / 1048576).toFixed(1)} MB de ${(e.quota / 1048576).toFixed(0)} MB disponíveis neste navegador. ${S.midias.length} mídia(s) cadastrada(s).`; });
  const drop = $('#drop'); if (drop) {
    const ui = { txt: (t, p) => { $('#impProg').hidden = false; $('#impTxt').textContent = t; $('#impBar').style.width = Math.round(p * 100) + '%'; }, fim: h => { $('#impBar').style.width = '100%'; $('#impTxt').textContent = 'Pronto.'; $('#impRes').innerHTML = h; hidratar(); } };
    const go = fs => { if (fs.length) importar([...fs], $('#impCat').value, ui).then(() => desenharShell()).catch(e => toast(e.message, 'err')); };
    $('#impArq').onchange = e => go(e.target.files); $('#impPasta').onchange = e => go(e.target.files);
    drop.ondragover = e => { e.preventDefault(); drop.classList.add('drag'); }; drop.ondragleave = () => drop.classList.remove('drag');
    drop.ondrop = async e => { e.preventDefault(); drop.classList.remove('drag'); go(await arquivosDoDrop(e.dataTransfer)); };
  }
  const ic = $('#impCatalogo'); if (ic) ic.onchange = async e => {
    try { const r = importarCatalogo(JSON.parse(await e.target.files[0].text())); $('#impCatRes').innerHTML = `<div class="infobox">${r.novos} novo(s), ${r.atualizados} atualizado(s), ${r.fotos} foto(s), ${r.videos} vídeo(s).${r.ignorados.length ? ' Ignorados (sem marca/modelo): ' + r.ignorados.length : ''}</div>`; desenharShell(); }
    catch (err) { $('#impCatRes').innerHTML = `<div class="warnbox">${esc(err.message)}</div>`; }
  };
  const ij = $('#impJson'); if (ij) ij.onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const d = JSON.parse(await f.text()); if (!Array.isArray(d.veiculos) || !Array.isArray(d.locadoras)) throw new Error('Arquivo não parece um backup do Hub.');
      if (!await confirmar({ titulo: 'Substituir dados?', texto: 'Os cadastros atuais serão substituídos pelos do backup. Arquivos de foto e vídeo não vêm no JSON: mídias de arquivo que não existirem neste navegador aparecerão como indisponíveis.', btn: 'Substituir' })) return;
      S = d; localStorage.setItem(KEY, JSON.stringify(S)); carregar(); toast('Backup importado.'); rotear();
    } catch (err) { toast('Não foi possível importar: ' + err.message, 'err'); }
  };
}
async function arquivosDoDrop(dt) {
  const out = [];
  const ler = async ent => {
    if (ent.isFile) await new Promise(r => ent.file(f => { Object.defineProperty(f, 'webkitRelativePath', { value: ent.fullPath.replace(/^\//, '') }); out.push(f); r(); }, r));
    else if (ent.isDirectory) { const rd = ent.createReader(); let lote; do { lote = await new Promise(r => rd.readEntries(r, () => r([]))); for (const x of lote) await ler(x); } while (lote.length); }
  };
  const ents = [...dt.items].map(i => i.webkitGetAsEntry && i.webkitGetAsEntry()).filter(Boolean);
  if (ents.length) for (const e of ents) await ler(e); else out.push(...dt.files);
  return out;
}

/* ===== popovers e busca global ===== */
function fecharPops() { ['gsPop', 'popRecentes', 'popUser'].forEach(i => { const e = $('#' + i); if (e) e.hidden = true; }); }
function pintarBuscaGlobal(q) {
  const pop = $('#gsPop'), n = norm(q).trim(); if (!n) { pop.hidden = true; return; }
  const termos = n.split(/\s+/);
  const vs = veiculosAtivos().filter(v => termos.every(t => norm([v.marca, v.modelo, v.versao, locadora(v.locadoraId)?.nome, nomeCatVeic(v.categoria)].join(' ')).includes(t))).slice(0, 5);
  const ms = S.midias.filter(m => !m.arquivado && !bloqueada(m) && termos.every(t => norm([m.titulo, (m.tags || []).join(' '), nomeVeiculo(veiculo(m.veiculoId)), nomeCat(m.categoria)].join(' ')).includes(t))).slice(0, 4);
  const ls = S.locadoras.filter(l => termos.every(t => norm(l.nome).includes(t))).slice(0, 2);
  pop.innerHTML = (vs.length ? '<h4>Veículos</h4>' + vs.map(v => `<a class="pop-item" href="#/veiculo/${v.id}">${ico('car', 'sm')}<span>${esc(nomeVeiculo(v))}<small>${esc(locadora(v.locadoraId)?.nome || 'Locadora n/i')}</small></span></a>`).join('') : '')
    + (ms.length ? '<h4>Mídias</h4>' + ms.map(m => `<button class="pop-item" data-act="abrirMidia" data-id="${m.id}">${ico(m.tipo === 'video' ? 'video' : 'image', 'sm')}<span>${esc(m.titulo)}<small>${esc(nomeCat(m.categoria))}</small></span></button>`).join('') : '')
    + (ls.length ? '<h4>Locadoras</h4>' + ls.map(l => `<a class="pop-item" href="#/locadora/${l.id}">${ico('building', 'sm')}<span>${esc(l.nome)}</span></a>`).join('') : '')
    + `<a class="pop-item" href="#/catalogo?q=${encodeURIComponent(q)}">${ico('search', 'sm')}<span>Buscar “${esc(q)}” no catálogo</span></a>`
    + `<a class="pop-item" href="#/clove">${ico('sparkles', 'sm')}<span>Perguntar ao Clove<small>Assistente com base nos dados</small></span></a>`;
  pop.hidden = false;
}
function pintarRecentes() {
  const vs = S.hist.veiculos.map(h => veiculo(h.id)).filter(Boolean).slice(0, 5), ms = S.hist.midias.map(h => midia(h.id)).filter(Boolean).slice(0, 5);
  $('#popRecentes').innerHTML = (vs.length || ms.length) ? (vs.length ? '<h4>Veículos</h4>' + vs.map(v => `<a class="pop-item" href="#/veiculo/${v.id}">${ico('car', 'sm')}<span>${esc(nomeVeiculo(v))}</span></a>`).join('') : '') + (ms.length ? '<h4>Materiais</h4>' + ms.map(m => `<button class="pop-item" data-act="abrirMidia" data-id="${m.id}">${ico('video', 'sm')}<span>${esc(m.titulo)}</span></button>`).join('') : '') : '<div class="pop-empty">Nada acessado ainda.</div>';
}
function pintarUser() {
  $('#popUser').innerHTML = `<h4>Perfil</h4><button class="pop-item ${!isAdmin() ? 'on' : ''}" data-act="setPapel" data-p="atendente">Atendente</button><button class="pop-item ${isAdmin() ? 'on' : ''}" data-act="setPapel" data-p="admin">Administrador</button>
    <div class="pop-empty xs">Nesta versão local o perfil só separa as telas. Autenticação real entra na hospedagem.</div><button class="pop-item" data-act="mudarNome">${ico('edit', 'sm')} Alterar meu nome</button>`;
}

/* ===== ações ===== */
async function baixar(m) {
  if (podeBaixar(m) && String(m.fileId).startsWith('cloud:')) {   // arquivo na nuvem: link assinado com download
    const u = await window.Nuvem.urlAssinada(m.fileId.slice(6), { baixarComo: (m.nomeOriginal || 'video.mp4').split('/').pop() });
    if (!u) return toast('Não consegui gerar o link de download. Faça login de novo.', 'err');
    const a = document.createElement('a'); a.href = u; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove();
    return toast('Download iniciado.');
  }
  if (podeBaixar(m) && m.origem === 'link') {   // arquivo hospedado no proprio site (ex.: reels da Dryve)
    try { const r = await fetch(m.url); if (!r.ok) throw new Error('HTTP ' + r.status); const b = await r.blob(); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = (m.nomeOriginal || 'video.mp4').split('/').pop(); document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); return toast('Download iniciado.'); }
    catch (e) { return toast('Não foi possível baixar: ' + e.message, 'err'); }
  }
  if (podeBaixar(m)) {
    const rec = await DB.get(m.fileId).catch(() => null);
    if (!rec) return toast('Arquivo não encontrado neste navegador.', 'err');
    const a = document.createElement('a'); a.href = URL.createObjectURL(rec.blob); a.download = (m.nomeOriginal || rec.name).split('/').pop(); document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast('Download iniciado.');
  } else if (m.origem === 'link' && m.url && !bloqueada(m)) { window.open(m.url, '_blank', 'noopener'); toast('Abrindo o link original — download direto indisponível para links externos.'); }
  else toast('Download não permitido para este material.', 'err');
}
function copiarLinkMidia(m) {
  copiar(linkMidia(m), linkMidiaInterno(m) ? 'Link interno copiado (só abre neste navegador até hospedar).' : 'Link copiado!');
}
function copiarMsgMidia(m) {
  if (bloqueada(m) || !compartilhavel(m)) return toast('Material sem autorização de uso: mensagem não gerada.', 'err');
  const r = mensagemMidia(m); if (!r.texto) return toast('Nenhum template ativo.', 'err');
  copiar(r.texto, r.faltando.length ? 'Mensagem copiada (campos sem dado foram omitidos).' : 'Mensagem copiada!');
}

const ACOES = {
  spinAuto: () => { const r = $('#spin'); if (!r) return; if (giroAuto) r._parar(); else r._auto(); },
  rail: () => { const r = $('#app').classList.toggle('rail'); try { localStorage.setItem('dh_rail', r ? '1' : '0'); } catch (e) { } },
  menu: () => { $('#side').classList.toggle('open'); $('#scrim').classList.toggle('open'); },
  recentes: () => { const p = $('#popRecentes'); const abrir = p.hidden; fecharPops(); if (abrir) { pintarRecentes(); p.hidden = false; } },
  userMenu: () => { const p = $('#popUser'); const abrir = p.hidden; fecharPops(); if (abrir) { pintarUser(); p.hidden = false; } },
  setPapel: d => { S.config.papel = d.p; salvar(); fecharPops(); toast('Perfil: ' + (isAdmin() ? 'administrador' : 'atendente')); rotear(); },
  virarAdmin: () => { S.config.papel = 'admin'; salvar(); rotear(); },
  mudarNome: () => formModal({ titulo: 'Seu nome', corpo: campo('nome', 'Nome exibido', { val: S.config.usuario, full: 1, req: 1 }), onSubmit: fd => { if (!fv(fd, 'nome')) return { nome: 'Informe um nome.' }; S.config.usuario = fv(fd, 'nome'); salvar(); fecharModal(); rotear(); } }),
  modalBg: (d, el, e) => { if (e.target === el) fecharModal(); },
  fecharModal: () => { fecharModal(); if (location.hash.startsWith('#/midia/')) history.replaceState(null, '', '#/biblioteca'); },
  fav: d => {
    const on = alternarFav(d.tipo, d.id);
    $$(`[data-act="fav"][data-id="${d.id}"]`).forEach(b => b.classList.toggle('on', on)); toast(on ? 'Adicionado aos favoritos.' : 'Removido dos favoritos.');
    desenharShell(); if (rota().segs[0] === 'favoritos') rotear();
  },
  abrirMidia: d => { fecharPops(); abrirViewer(d.id); },
  infoMidia: () => { const b = $('#infoBox'); b.hidden = !b.hidden; },
  ampliar: () => { const el = $('#vwEl') || $('#spin') || $('model-viewer'); if (el?.requestFullscreen) el.requestFullscreen().catch(() => toast('Tela cheia indisponível.', 'err')); },
  copiarLinkMidia: d => copiarLinkMidia(midia(d.id)),
  copiarMsgMidia: d => copiarMsgMidia(midia(d.id)),
  baixarMidia: d => baixar(midia(d.id)),
  autoVincular: () => autoVincularMidias(),
  toggleSugeridos: () => { S.config.mostrarSugeridos = !S.config.mostrarSugeridos; aplicarSugeridas(); salvar(); rotear(); },
  copiarTexto: d => copiar(d.t),
  /* catálogo */
  limparFiltros: () => { F = F0(); rotear(); },
  novoVeiculo: () => abrirFormVeiculo(), editarVeiculo: d => abrirFormVeiculo(d.id),
  fichaTab: d => { fichaTab = d.tab; rotear(); }, plano: d => { planoSel = Number(d.i); rotear(); },
  copiarLinkVeiculo: d => copiar(linkVeiculo(veiculo(d.id)), (S.config.baseUrl || window.DRYVE) ? 'Link copiado!' : 'Link interno copiado (abre só neste navegador até hospedar).'),
  msgVeiculo: d => { const t = S.templates.find(x => x.tipo === 'veiculo' && !x.arquivado); M = { tpl: t?.id || '', vid: d.id, plano: planoSel, mid: '', texto: null }; location.hash = '#/mensagens'; },
  /* biblioteca / clientes */
  escopo: d => { B.escopo = d.k; rotear(); }, modoBib: d => { B.modo = d.k; rotear(); },
  novaMidia: d => abrirFormMidia(null, { vid: d.vid }), novoCliente: () => abrirFormMidia(null, { cliente: true }), editarMidia: d => abrirFormMidia(d.id),
  excluirMidia: async d => { const m = midia(d.id); if (await confirmar({ titulo: 'Excluir mídia?', texto: `“${esc(m.titulo)}” e o arquivo guardado serão removidos definitivamente.`, btn: 'Excluir' })) { apagarArquivosMidia(m); S.midias = S.midias.filter(x => x !== m); S.favoritos.midias = S.favoritos.midias.filter(x => x !== m.id); salvar(); toast('Mídia excluída.'); rotear(); } },
  /* mensagens */
  resetMsg: () => { M.texto = null; pintarMensagens(); },
  copiarMsg: () => { const t = $('#msgTxt').value; if (!t.trim()) return toast('A mensagem está vazia.', 'err'); S.hist.tplUso[M.tpl] = (S.hist.tplUso[M.tpl] || 0) + 1; salvar(); copiar(t, 'Mensagem copiada!'); },
  copiarLinkMsg: () => { const m = M.mid && midia(M.mid), v = veiculo(M.vid); if (m) copiarLinkMidia(m); else if (v) copiar(linkVeiculo(v), 'Link do veículo copiado!'); },
  abrirMaterial: () => { if (M.mid) abrirViewer(M.mid); else if (M.vid) location.hash = '#/veiculo/' + M.vid; },
  novoTemplate: () => abrirFormTemplate(), editarTemplate: d => abrirFormTemplate(d.id), duplicarTemplate: d => abrirFormTemplate(d.id, true),
  arquivarTemplate: async d => { const t = S.templates.find(x => x.id === d.id); if (t.arquivado || await confirmar({ titulo: 'Arquivar template?', texto: `“${esc(t.nome)}” deixa de aparecer para os atendentes. Dá para restaurar depois.`, btn: 'Arquivar' })) { t.arquivado = !t.arquivado; salvar(); rotear(); } },
  inserirCampo: d => { const ta = $('#mform textarea[name=corpo]'); const p = ta.selectionStart; ta.setRangeText(`{{${d.k}}}`, p, ta.selectionEnd, 'end'); ta.focus(); },
  /* clove */
  sugestao: d => { const f = $('[data-form=clove] input'); f.value = d.q; enviarClove(d.q); },
  limparFoco: () => { S.clove.foco = []; salvar(); rotear(); },
  limparChat: async () => { if (await confirmar({ titulo: 'Limpar histórico?', texto: 'A conversa com o Clove será apagada deste navegador.', btn: 'Limpar' })) { S.clove.historico = []; S.clove.foco = []; salvar(); rotear(); } },
  usarVeiculo: d => { S.clove.foco = [d.id]; S.clove.historico.push({ papel: 'bot', texto: `Certo, vou considerar **${nomeVeiculo(veiculo(d.id))}**. O que quer saber sobre ele?` }); salvar(); rotear(); },
  testarClove: async () => {
    const ep = $('[data-form=cloveCfg] [name=endpoint]').value.trim(); if (!ep || !urlOk(ep)) return toast('Informe um endereço válido antes de testar.', 'err');
    try { const r = await fetch(ep, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pergunta: 'ping', regras: Clove.REGRAS, historico: [], contexto: { veiculos: [], midias: [] } }) }); if (!r.ok) throw new Error('HTTP ' + r.status); const j = await r.json(); toast(j.texto ? 'API respondeu corretamente.' : 'API respondeu, mas sem o campo "texto".', j.texto ? '' : 'err'); }
    catch (e) { toast('Falha ao conectar: ' + e.message + ' (CORS ou endereço incorreto?)', 'err'); }
  },
  /* admin */
  goAdmin: d => { location.hash = '#/admin/' + d.tab; },
  addPlano: () => $('#planos').insertAdjacentHTML('beforeend', planoRow()), rmPlano: (d, el) => el.closest('[data-plano]').remove(),
  novaLocadora: () => abrirFormLocadora(), editarLocadora: d => abrirFormLocadora(d.id),
  excluirLocadora: async d => { const l = locadora(d.id), n = S.veiculos.filter(v => v.locadoraId === d.id).length; if (await confirmar({ titulo: 'Excluir locadora?', texto: `“${esc(l.nome)}” será removida.${n ? ` ${n} veículo(s) ficarão com a locadora “Não informada”.` : ''}`, btn: 'Excluir' })) { S.veiculos.forEach(v => { if (v.locadoraId === d.id) v.locadoraId = ''; }); S.midias.forEach(m => { if (m.locadoraId === d.id) m.locadoraId = ''; }); S.locadoras = S.locadoras.filter(x => x !== l); salvar(); rotear(); } },
  arquivarVeiculo: async d => { const v = veiculo(d.id); if (v.arquivado || await confirmar({ titulo: 'Arquivar veículo?', texto: `“${esc(nomeVeiculo(v))}” sai do catálogo e das buscas, mas as mídias são mantidas. Dá para restaurar.`, btn: 'Arquivar' })) { v.arquivado = !v.arquivado; v.atualizadoEm = agora(); salvar(); rotear(); } },
  rmCategoria: async d => { if (S.midias.some(m => m.categoria === d.k)) return toast('Categoria em uso por mídias. Reclassifique-as antes de remover.', 'err'); S.catsExtras = S.catsExtras.filter(c => c.key !== d.k); salvar(); rotear(); },
  exportar: () => { baixarTexto(`dryve-hub-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(S, null, 1)); toast('Backup exportado.'); },
  carregarDemo: () => { carregarDemo(); toast('Dados de demonstração carregados (marcados como DEMO).'); rotear(); },
  removerDemo: async () => { if (await confirmar({ titulo: 'Remover demonstração?', texto: 'Remove só os registros marcados como DEMONSTRAÇÃO. Dados reais permanecem.', btn: 'Remover' })) { removerDemo(); toast('Demonstração removida.'); rotear(); } },
  resetTudo: async () => { if (await confirmar({ titulo: 'Apagar tudo?', texto: 'Todos os cadastros e arquivos guardados neste navegador serão apagados. Faça um backup antes.', btn: 'Apagar tudo' })) { localStorage.removeItem(KEY); indexedDB.deleteDatabase('dryve_hub'); location.hash = '#/'; setTimeout(() => location.reload(), 300); } }
};

/* ===== Clove: envio ===== */
async function enviarClove(texto) {
  texto = texto.trim(); if (!texto) return;
  const h = S.clove.historico; h.push({ papel: 'user', texto });
  const log = $('#chatLog'); log.insertAdjacentHTML('beforeend', msgHTML({ papel: 'user', texto }) + `<div class="msg bot" id="typing"><div class="av">${ico('sparkles', 'sm')}</div><div class="bubble typing"><i></i><i></i><i></i></div></div>`); log.scrollTop = log.scrollHeight;
  const inp = $('[data-form=clove] input'); if (inp) inp.value = '';
  let r; try { r = await Clove.responder(texto); } catch (e) { r = { texto: 'Ocorreu um erro ao consultar os dados: ' + e.message }; }
  h.push({ papel: 'bot', texto: r.texto, veiculos: r.veiculos, midias: r.midias, tabela: r.tabela, mensagem: r.mensagem, escolha: r.escolha, aviso: r.aviso });
  if (r.veiculos?.length && !r.escolha && r.veiculos.length <= 3) S.clove.foco = r.veiculos.slice();
  if (h.length > 60) h.splice(0, h.length - 60);
  salvar(); if (rota().segs[0] !== 'clove') return;
  rotear(); $('[data-form=clove] input')?.focus();
}

/* ===== eventos ===== */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (el) { const fn = ACOES[el.dataset.act]; if (fn) { if (el.tagName !== 'A' && el.dataset.act !== 'modalBg') e.preventDefault(); fn(el.dataset, el, e); } return; }
  if (!e.target.closest('.pop-wrap') && !e.target.closest('.gsearch')) fecharPops();
});
document.addEventListener('keydown', e => {
  const t = e.target;
  if (e.key === 'Escape') { if ($('#confirmRoot').innerHTML) return; if ($('#modalRoot').innerHTML) ACOES.fecharModal(); else fecharPops(); }
  else if ((e.key === 'Enter' || e.key === ' ') && t.matches('[role=button][data-act]')) { e.preventDefault(); ACOES[t.dataset.act]?.(t.dataset, t, e); }
  else if (e.key === '/' && !t.matches('input,textarea,select') && !$('#modalRoot').innerHTML) { e.preventDefault(); $('#gsearch').focus(); }
  else if (e.key === 'Enter' && t.id === 'gsearch' && t.value.trim()) { location.hash = '#/catalogo?q=' + encodeURIComponent(t.value.trim()); t.blur(); }
});
document.addEventListener('input', e => {
  const t = e.target, d = t.dataset;
  if (t.id === 'gsearch') return pintarBuscaGlobal(t.value);
  if (d.f !== undefined) { F[d.f] = t.type === 'checkbox' ? t.checked : t.value; return pintarCatalogo(); }
  if (d.b !== undefined) { B[d.b] = t.value; return pintarBiblioteca(); }
  if (d.c !== undefined) { C[d.c] = t.value; return pintarClientes(); }
  if (d.am !== undefined) { AM.q = t.value; const b = $('#amBody'); if (b) { const q = norm(AM.q); b.innerHTML = linhasMidia(S.midias.filter(m => !q || norm([m.titulo, m.nomeOriginal, nomeCat(m.categoria), nomeVeiculo(veiculo(m.veiculoId))].join(' ')).includes(q)).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))); hidratar(b); } return; }
  if (t.id === 'msgTxt') { M.texto = t.value; }
});
document.addEventListener('change', e => {
  const t = e.target, d = t.dataset;
  if (d.m !== undefined) {
    M[d.m] = t.value; if (d.m === 'vid') { M.plano = 0; M.mid = ''; } if (d.m === 'plano') M.plano = Number(t.value);
    if (d.m !== 'tpl') { /* mantém edição manual só se o usuário não trocou as seleções */ } M.texto = null; pintarMensagens();
  }
  if (d.f !== undefined && t.tagName === 'SELECT') pintarCatalogo();
});
document.addEventListener('submit', e => {
  const f = e.target.closest('[data-form]'); if (!f) return; e.preventDefault();
  const fd = new FormData(f), k = f.dataset.form;
  if (k === 'busca-home') location.hash = '#/catalogo?q=' + encodeURIComponent((fd.get('q') || '').toString().trim());
  else if (k === 'clove') enviarClove((fd.get('q') || '').toString());
  else if (k === 'categoria') {
    const nome = (fd.get('nome') || '').toString().trim(); if (!nome) return toast('Informe o nome da categoria.', 'err');
    if (categoriasMidia().some(c => norm(c[1]) === norm(nome))) return toast('Essa categoria já existe.', 'err');
    S.catsExtras.push({ key: 'c_' + norm(nome).replace(/[^a-z0-9]+/g, '_'), nome }); salvar(); toast('Categoria criada.'); rotear();
  } else if (k === 'cloveCfg') {
    const ep = (fd.get('endpoint') || '').toString().trim(), bu = (fd.get('baseUrl') || '').toString().trim();
    if ((ep && !urlOk(ep)) || (bu && !urlOk(bu))) return toast('Use endereços completos começando com http:// ou https://.', 'err');
    S.config.cloveEndpoint = ep; S.config.baseUrl = bu; salvar(); toast(ep ? 'API do Clove configurada.' : 'Clove em modo demonstração.'); rotear();
  }
});
document.addEventListener('dragover', e => e.preventDefault()); document.addEventListener('drop', e => { if (!e.target.closest('#drop')) e.preventDefault(); });
window.addEventListener('hashchange', rotear);

/* ===== início ===== */
(async function init() {
  carregar();
  try { await DB.open(); } catch (e) { toast('Armazenamento de arquivos indisponível neste navegador (modo privado?). Uploads não funcionarão.', 'err'); }
  S.midias = S.midias.filter(x => !(x.origem === 'link' && x.tipo === 'foto' && /^https?:\/\/cdn-meoobackoffice-veiculos-api-prd\.localiza\.com/.test(x.url || '')));
  for (const cat of (window.CATALOGOS_INICIAIS || [])) {
    if (S.catalogosImportados.includes(cat.id)) continue;
    try { importarCatalogo(cat); S.catalogosImportados.push(cat.id); salvar(); } catch (e) { console.error('catálogo inicial', e); }
  }
  if (window.Nuvem) window.Nuvem.mesclar();   // depois dos catalogos: a nuvem precisa dos veiculos para ligar cada video ao carro
  aplicarSugeridas(); marcarMarcaDagua(); salvar();
  desenharShell(); rotear();
})();
