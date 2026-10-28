'use strict';
/* ===== componentes visuais ===== */
const placeholderCar = (txt = 'Sem foto') => `<div class="ph">${ico('car')}<span>${txt}</span></div>`;
function imgDe(m, alt = '') {
  if (!m) return placeholderCar();
  if (m.origem === 'link' && m.url) return `<img src="${esc(m.url)}" alt="${esc(alt)}" loading="lazy" onerror="this.style.display='none'">`;
  return `<img data-fid="${m.fileId}" alt="${esc(alt)}">`;
}
function fotoPrincipal(v) {
  const fs = midiasDe(v.id).filter(m => m.tipo === 'foto');
  return fs.find(m => m.id === v.fotoPrincipalId) || fs[0] || fotoDoModelo(v) || null;
}
/* versao sem foto propria usa a foto de outra versao do mesmo modelo (marca + modelo) */
let _fm = { k: '', m: new Map() };
function fotoDoModelo(v) {
  const k = S.midias.length + ':' + S.veiculos.length;
  if (_fm.k !== k) { _fm = { k, m: new Map() }; for (const m of S.midias) if (m.tipo === 'foto' && !m.arquivado && m.veiculoId) { const x = veiculo(m.veiculoId); const c = x && modeloChaveDe(x); if (c && !_fm.m.has(c)) _fm.m.set(c, m); } }
  return _fm.m.get(modeloChaveDe(v)) || null;
}
function thumbMidia(m) {
  if (m.tipo === 'giro') { const f = m.frames?.[0]; return f ? (f.url ? `<img src="${esc(f.url)}" alt="">` : `<img data-fid="${f.fileId}" alt="">`) : ''; }
  if (m.tipo === 'modelo3d') return `<span style="color:#7f95c4">${ico('car', 'lg')}</span>`;
  if (m.thumbId) return `<img data-fid="${m.thumbId}" alt="">`;
  if (m.tipo === 'foto') return imgDe(m, m.titulo);
  if (m.thumbUrl) return `<img src="${esc(m.thumbUrl)}" alt="" loading="lazy">`;
  return `<span style="color:#7f95c4">${ico('video', 'lg')}</span>`;
}
const favBtn = (tipo, id) => `<button class="icon-btn ${ehFav(tipo, id) ? 'on' : ''}" data-act="fav" data-tipo="${tipo}" data-id="${id}" aria-label="Favoritar" title="Favoritar">${ico('star', 'sm')}</button>`;

function cardVeiculo(v) {
  const p = precoMin(v), pl = planoPrincipal(v), loc = locadora(v.locadoraId);
  const nv = midiasDe(v.id).filter(m => m.tipo === 'video').length;
  const carroceria = (v.segmento && v.segmento.includes('|')) ? v.segmento.split('|').pop().trim() : (v.categoria ? nomeCatVeic(v.categoria) : '');
  const plano = pl && (pl.prazo || pl.km) ? [pl.prazo ? pl.prazo + 'm' : '', pl.km ? Number(pl.km).toLocaleString('pt-BR') + ' km' : ''].filter(Boolean).join(' · ') : '';
  return `<a class="card vcard" href="#/veiculo/${v.id}" aria-label="${esc(nomeVeiculo(v))}">
    <div class="vimg">${imgDe(fotoPrincipal(v), nomeVeiculo(v))}
      <div class="badges">${v.demo ? '<span class="tag demo">DEMO</span>' : ''}${v.combustivel ? `<span class="tag">${esc(v.combustivel)}</span>` : ''}${v.categoria === 'premium' ? '<span class="tag dark">Premium</span>' : ''}${v.entregaRapida === true && v.fonte ? '<span class="tag ok">Entrega rápida</span>' : ''}</div>
      <span class="fav" data-stop="1">${favBtn('veiculos', v.id)}</span></div>
    <div class="vbody">
      <div class="vtitle"><h3>${esc([v.marca, v.modelo].filter(Boolean).join(' ') || NI)}</h3>${carroceria ? `<span class="tag cat">${esc(carroceria)}</span>` : ''}</div>
      <div class="ver">${esc(v.versao || 'Versão não informada')}${v.ano ? ' · ' + esc(v.ano) : ''}</div>
      <div class="vinfo"><div><small>${loc ? esc(loc.nome) : 'Locadora'}</small><span>${plano ? esc(plano) : 'Plano sob consulta'}</span></div>
        <div class="vpreco">${p != null ? `<small>a partir de</small><b>${brl(p)}</b>` : '<b class="ni">Sob consulta</b>'}</div></div>
      ${nv ? `<div class="vmeta">${ico('video', 'sm')} ${nv} vídeo${nv === 1 ? '' : 's'} para baixar</div>` : ''}
    </div></a>`;
}

function cardMidia(m, modo = 'grade') {
  const v = veiculo(m.veiculoId), bl = bloqueada(m), a = AUTORIZACAO[m.autorizacao];
  const dl = podeBaixar(m), tem3d = m.tipo === 'giro' || m.tipo === 'modelo3d';
  const thumb = `<div class="mthumb" data-act="abrirMidia" data-id="${m.id}" role="button" tabindex="0" aria-label="Abrir ${esc(m.titulo)}">${thumbMidia(m)}
      ${bl ? `<div class="lock"><div>${ico('lock', 'lg')}<div>Restrito — uso não liberado</div></div></div>` : (m.tipo === 'video' ? `<span class="play">${ico('play')}</span>` : tem3d ? `<span class="play">${ico('refresh')}</span>` : '')}
      <div class="tl">${m.tipo === 'giro' ? '<span class="tag blue">360°</span>' : m.tipo === 'modelo3d' ? '<span class="tag blue">3D</span>' : ''}${m.demo ? '<span class="tag demo">DEMO</span>' : ''}${(m.tags || []).includes('sugerido-auto') ? '<span class="tag warn">SUGERIDO · revisar</span>' : ''}${(m.tags || []).includes('marca-dagua-terceiros') ? '<span class="tag bad" title="Vídeo do TikTok de outra loja: não envie ao cliente sem autorização">Marca d’água de terceiros</span>' : ''}${a && m.cliente ? `<span class="tag ${a[1]}">${a[0]}</span>` : ''}</div></div>`;
  const meta = `${esc(nomeCat(m.categoria))}${v ? ' · ' + esc(marcaModelo(v)) : ''}`;
  const acts = bl ? '' : `<button class="icon-btn" data-act="abrirMidia" data-id="${m.id}" title="${m.tipo === 'video' ? 'Reproduzir' : tem3d ? 'Girar' : 'Ver'}">${ico(m.tipo === 'video' ? 'play' : tem3d ? 'refresh' : 'expand', 'sm')}</button>
      <button class="icon-btn" data-act="copiarLinkMidia" data-id="${m.id}" title="Copiar link">${ico('link', 'sm')}</button>
      <button class="icon-btn" data-act="copiarMsgMidia" data-id="${m.id}" title="Copiar mensagem pronta">${ico('message', 'sm')}</button>
      ${tem3d && m.tipo === 'giro' ? '' : `<button class="icon-btn" data-act="baixarMidia" data-id="${m.id}" title="${dl ? 'Baixar' : 'Abrir link original'}">${ico(dl ? 'download' : 'external', 'sm')}</button>`}${favBtn('midias', m.id)}`;
  if (modo === 'lista') return `<div class="card lrow">${thumb}<div><h3>${esc(m.titulo)}</h3><div class="small muted">${meta} · ${dataBR(m.criadoEm)}</div></div><div class="mact">${acts}</div></div>`;
  return `<div class="card mcard">${thumb}<div class="mbody"><h3>${esc(m.titulo)}</h3><div class="xs muted">${meta}</div>${m.descricao ? `<p>${esc(m.descricao)}</p>` : ''}<div class="mact">${acts}</div></div></div>`;
}
const mesmaOrigem = u => { try { return new URL(u).origin === location.origin; } catch (e) { return false; } };
const podeBaixar = m => (m.origem !== 'link' || mesmaOrigem(m.url)) && m.permiteDownload !== false && !bloqueada(m);

function cardLocadora(l) {
  const n = veiculosAtivos().filter(v => v.locadoraId === l.id).length;
  return `<a class="card pad" href="#/locadora/${l.id}" style="color:inherit;display:grid;gap:8px">
    <div class="row"><div class="avatar" style="border-radius:12px;width:44px;height:44px;font-size:16px">${l.logoUrl ? `<img src="${esc(l.logoUrl)}" alt="" style="width:100%;height:100%;object-fit:contain;border-radius:12px;background:#fff">` : esc(l.nome[0])}</div>
    <div><h3>${esc(l.nome)}</h3><div class="xs muted">${n} veículo${n === 1 ? '' : 's'} vinculado${n === 1 ? '' : 's'}</div></div><span class="sp"></span>${l.demo ? '<span class="tag demo">DEMO</span>' : ''}</div>
    <div class="small muted">${esc(l.descricao || 'Sem descrição cadastrada.')}</div></a>`;
}

/* ===== VISÃO GERAL ===== */
/* carro do hero: primeiro veiculo ativo com foto (de preferencia imagem transparente da Movida/Localiza) */
function heroCarro() {
  for (const v of veiculosAtivos()) { const f = fotoPrincipal(v); if (f && f.origem === 'link' && /\.webp|_next\/image/.test(f.url || '')) return `<img class="hero-car" src="${esc(f.url)}" alt="" onerror="this.remove()">`; }
  return '';
}
function viewHome() {
  const ativos = veiculosAtivos();
  const videos = S.midias.filter(m => m.tipo === 'video' && !m.arquivado);
  const recVeic = S.hist.veiculos.map(h => veiculo(h.id)).filter(v => v && !v.arquivado).slice(0, 8);
  const topModelos = Object.entries(S.hist.views).map(([id, n]) => [veiculo(id), n]).filter(([v]) => v && !v.arquivado).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const novos = videos.filter(m => !bloqueada(m)).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)).slice(0, 6);
  const cli = videos.filter(m => m.cliente && m.autorizacao === 'autorizado').slice(0, 6);
  const tops = S.templates.filter(t => !t.arquivado).map(t => [t, S.hist.tplUso[t.id] || 0]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const favV = S.favoritos.veiculos.map(veiculo).filter(Boolean).slice(0, 4), favM = S.favoritos.midias.map(midia).filter(Boolean).slice(0, 4);
  const incompletas = ativos.filter(v => camposFaltando(v).length).length;
  return `
  <section class="hero">
    <div class="hero-txt">
      <div class="hello"><div class="kick">Atendimento · ${esc(new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }))}</div><h1>${saudacao()}, <span class="hl">${esc((S.config.usuario || 'Atendente').split(' ')[0])}</span></h1></div>
      <h2 class="hero-q">Qual veículo você está procurando?</h2>
      <form data-form="busca-home"><span class="gs-ico">${ico('search', 'sm')}</span><input type="search" name="q" placeholder="Marca, modelo, versão ou locadora" aria-label="Buscar veículo" autofocus><button class="btn primary" type="submit">Buscar</button></form>
      <div class="chips" style="margin-top:16px">${S.locadoras.map(l => `<a class="chip" href="#/catalogo?loc=${l.id}">${esc(l.nome)}</a>`).join('')}<a class="chip" href="#/catalogo">Todo o catálogo</a></div>
      <div class="kpis"><div class="kpi"><b>${ativos.length}</b><span>Veículos</span></div><div class="kpi"><b>${videos.filter(m => !m.cliente).length}</b><span>Vídeos para baixar</span></div><div class="kpi"><b>${S.locadoras.length}</b><span>Locadoras</span></div><div class="kpi"><b>${incompletas}</b><span>Fichas incompletas</span></div></div>
    </div>
    <div class="hero-art" aria-hidden="true"><div class="hero-circle"><div class="hero-badge">Carro 0 km<b>por assinatura</b></div>${heroCarro()}</div></div>
  </section>

  <div class="sec-head"><div><h2>Consultados recentemente</h2></div></div>
  ${recVeic.length ? `<div class="hscroll">${recVeic.map(cardVeiculo).join('')}</div>` : vazio('clock', 'Nada consultado ainda', 'Os veículos que você abrir aparecem aqui para voltar com um clique.')}

  <div class="grid g-2" style="margin-top:26px">
    <div class="card pad"><h2>Modelos mais acessados</h2>
      ${topModelos.length ? `<div style="margin-top:10px">${topModelos.map(([v, n], i) => `<a class="pop-item" href="#/veiculo/${v.id}"><b style="width:18px;color:var(--muted)">${i + 1}</b><span>${esc(marcaModelo(v))}<small>${n} acesso${n > 1 ? 's' : ''} neste navegador</small></span></a>`).join('')}</div>` : '<p class="muted small">Calculado a partir das fichas abertas. Ainda sem acessos.</p>'}</div>
    <div class="card pad"><h2>Materiais de atendimento mais usados</h2>
      ${tops.length ? `<div style="margin-top:10px">${tops.map(([t, n]) => `<a class="pop-item" href="#/mensagens?tpl=${t.id}">${ico('message', 'sm')}<span>${esc(t.nome)}<small>${n} uso${n > 1 ? 's' : ''}</small></span></a>`).join('')}</div>` : '<p class="muted small">Contagem de mensagens geradas. Ainda sem uso.</p>'}</div>
  </div>

  <div class="sec-head"><div><h2>Vídeos adicionados recentemente</h2></div><span class="sp"></span><a class="btn sm" href="#/biblioteca">Ver biblioteca</a></div>
  ${novos.length ? `<div class="grid g-media">${novos.map(m => cardMidia(m)).join('')}</div>` : vazio('video', 'Nenhum vídeo cadastrado', 'Importe os ZIPs de BANCOS e Cores ou envie vídeos pela Administração.', isAdmin() ? '<a class="btn primary" href="#/admin/importar">Importar materiais</a>' : '')}

  <div class="sec-head"><div><h2>Vídeos de clientes para compartilhar</h2><p>Somente com autorização de uso.</p></div><span class="sp"></span><a class="btn sm" href="#/clientes">Ver todos</a></div>
  ${cli.length ? `<div class="grid g-media">${cli.map(m => cardMidia(m)).join('')}</div>` : vazio('users', 'Nenhum vídeo de cliente liberado', 'Cadastre retiradas e depoimentos na área Clientes e retiradas, marcando a autorização de uso.')}

  <div class="grid g-2" style="margin-top:26px">
    <a class="card pad clove-card" href="#/clove" style="color:inherit">
      <div class="kick">Assistente</div><div class="row"><span class="avatar grad">${ico('sparkles', 'sm')}</span><h2>Clove Assistente</h2></div>
      <p class="muted" style="margin:8px 0 0">Pergunte sobre carros, prazos, vídeos e peça mensagens prontas. Responde só com o que está cadastrado.</p></a>
    <div class="card pad"><h2>Favoritos</h2>
      ${favV.length || favM.length ? `<div style="margin-top:10px">${favV.map(v => `<a class="pop-item" href="#/veiculo/${v.id}">${ico('car', 'sm')}<span>${esc(nomeVeiculo(v))}</span></a>`).join('')}${favM.map(m => `<div class="pop-item" data-act="abrirMidia" data-id="${m.id}">${ico('video', 'sm')}<span>${esc(m.titulo)}</span></div>`).join('')}</div>` : '<p class="muted small">Toque na estrela de um veículo ou vídeo para guardá-lo aqui.</p>'}</div>
  </div>`;
}

/* ===== CATÁLOGO ===== */
const F0 = () => ({ q: '', loc: '', marca: '', modelo: '', cat: '', cambio: '', comb: '', pmin: '', pmax: '', lug: '', prazo: '', km: '', disp: '', vint: false, vext: false, vcli: false, ord: 'nome' });
let F = F0();
function opts(arr, atual, todos = 'Todos') {
  return `<option value="">${todos}</option>` + arr.map(a => { const [k, n] = Array.isArray(a) ? a : [a, a]; return `<option value="${esc(k)}" ${String(atual) === String(k) ? 'selected' : ''}>${esc(n)}</option>`; }).join('');
}
const uniq = a => [...new Set(a.filter(Boolean))].sort((x, y) => String(x).localeCompare(String(y), 'pt-BR', { numeric: true }));
function viewCatalogo(params) {
  if (params) { F = F0(); for (const [k, v] of params) if (k in F) F[k] = v; }
  const vs = veiculosAtivos();
  const prazos = uniq(vs.flatMap(v => v.planos.map(p => p.prazo))), kms = uniq(vs.flatMap(v => v.planos.map(p => p.km)));
  return `<div class="page-head"><div><h1>Catálogo de veículos</h1><p>Encontre o carro, compare versões e consulte as condições por locadora.</p></div><span class="sp"></span>${isAdmin() ? '<button class="btn primary" data-act="novoVeiculo">' + ico('plus', 'sm') + ' Novo veículo</button>' : ''}</div>
  <div class="cat-lay">
    <aside class="card filters" aria-label="Filtros"><div class="fh"><h3>Filtros</h3><span class="sp"></span><button class="btn sm ghost" data-act="limparFiltros">Limpar</button></div>
      <label class="f">Busca<input type="search" data-f="q" value="${esc(F.q)}" placeholder="Marca, modelo, versão..."></label>
      <label class="f">Locadora<select data-f="loc">${opts(S.locadoras.map(l => [l.id, l.nome]), F.loc)}</select></label>
      <label class="f">Marca<select data-f="marca">${opts(uniq(vs.map(v => v.marca)), F.marca)}</select></label>
      <label class="f">Modelo<select data-f="modelo">${opts(uniq(vs.map(v => v.modelo)), F.modelo)}</select></label>
      <label class="f">Categoria<select data-f="cat">${opts(CATEGORIAS_VEICULO, F.cat)}</select></label>
      <label class="f">Câmbio<select data-f="cambio">${opts(uniq(vs.map(v => v.cambio)), F.cambio)}</select></label>
      <label class="f">Combustível<select data-f="comb">${opts(uniq(vs.map(v => v.combustivel)), F.comb)}</select></label>
      <div class="fgroup"><label class="f">Mensalidade de<input type="number" min="0" step="50" data-f="pmin" value="${esc(F.pmin)}" placeholder="R$"></label><label class="f">até<input type="number" min="0" step="50" data-f="pmax" value="${esc(F.pmax)}" placeholder="R$"></label></div>
      <label class="f">Lugares<select data-f="lug">${opts(uniq(vs.map(v => v.lugares)), F.lug)}</select></label>
      <label class="f">Prazo (meses)<select data-f="prazo">${opts(prazos, F.prazo)}</select></label>
      <label class="f">Quilometragem mensal<select data-f="km">${opts(kms.map(k => [k, Number(k).toLocaleString('pt-BR') + ' km']), F.km)}</select></label>
      <label class="f">Disponibilidade<select data-f="disp">${opts(uniq(vs.map(v => v.disponibilidade)), F.disp)}</select></label>
      <label class="chk"><input type="checkbox" data-f="vint" ${F.vint ? 'checked' : ''}> Com vídeos internos</label>
      <label class="chk"><input type="checkbox" data-f="vext" ${F.vext ? 'checked' : ''}> Com vídeos externos</label>
      <label class="chk"><input type="checkbox" data-f="vcli" ${F.vcli ? 'checked' : ''}> Com vídeos de clientes</label>
    </aside>
    <section>${avisoPreco(null, true)}<div class="res-bar" style="margin-top:14px"><strong id="resCount"></strong><span class="sp"></span><label class="row small muted">Ordenar<select data-f="ord" style="width:auto"><option value="nome" ${F.ord === 'nome' ? 'selected' : ''}>Nome</option><option value="menor" ${F.ord === 'menor' ? 'selected' : ''}>Menor mensalidade</option><option value="maior" ${F.ord === 'maior' ? 'selected' : ''}>Maior mensalidade</option><option value="recente" ${F.ord === 'recente' ? 'selected' : ''}>Atualização recente</option></select></label></div>
    <div id="catRes"></div></section></div>`;
}
function filtrarVeiculos() {
  const f = F, q = norm(f.q);
  let l = veiculosAtivos().filter(v => {
    if (q && !q.split(/\s+/).every(t => norm([v.marca, v.modelo, v.versao, nomeCatVeic(v.categoria), locadora(v.locadoraId)?.nome, v.cambio, v.combustivel, v.ano].join(' ')).includes(t))) return false;
    if (f.loc && v.locadoraId !== f.loc) return false; if (f.marca && v.marca !== f.marca) return false; if (f.modelo && v.modelo !== f.modelo) return false;
    if (f.cat && v.categoria !== f.cat) return false; if (f.cambio && v.cambio !== f.cambio) return false; if (f.comb && v.combustivel !== f.comb) return false;
    if (f.lug && String(v.lugares) !== String(f.lug)) return false; if (f.disp && v.disponibilidade !== f.disp) return false;
    const pmin = num(f.pmin), pmax = num(f.pmax);
    const planos = v.planos.filter(p => (!f.prazo || String(p.prazo) === String(f.prazo)) && (!f.km || String(p.km) === String(f.km)));
    if ((f.prazo || f.km) && !planos.length) return false;
    if (pmin != null || pmax != null) { if (!planos.some(p => p.mensalidade != null && (pmin == null || p.mensalidade >= pmin) && (pmax == null || p.mensalidade <= pmax))) return false; }
    if (f.vint && !grupoVideos(v.id, 'internos').length) return false; if (f.vext && !grupoVideos(v.id, 'externos').length) return false;
    if (f.vcli && !grupoVideos(v.id, 'clientes').some(m => m.autorizacao === 'autorizado')) return false;
    return true;
  });
  const cmpNome = (a, b) => nomeVeiculo(a).localeCompare(nomeVeiculo(b), 'pt-BR');
  if (f.ord === 'menor') l.sort((a, b) => (precoMin(a) ?? 1e12) - (precoMin(b) ?? 1e12) || cmpNome(a, b));
  else if (f.ord === 'maior') l.sort((a, b) => (precoMin(b) ?? -1) - (precoMin(a) ?? -1) || cmpNome(a, b));
  else if (f.ord === 'recente') l.sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm));
  else l.sort(cmpNome);
  return l;
}
function pintarCatalogo() {
  const l = filtrarVeiculos(), box = $('#catRes'); if (!box) return;
  $('#resCount').textContent = `${l.length} veículo${l.length === 1 ? '' : 's'}`;
  box.innerHTML = l.length ? `<div class="grid g-veic">${l.map(cardVeiculo).join('')}</div>` :
    vazio('search', 'Nenhum veículo com esses filtros', 'Remova algum filtro ou limpe tudo para ver o catálogo completo.', '<button class="btn" data-act="limparFiltros">Limpar filtros</button>');
  hidratar(box);
}

/* ===== FICHA DO VEÍCULO ===== */
let fichaTab = 'fotos', planoSel = 0;
function viewVeiculo(id, tab) {
  const v = veiculo(id);
  if (!v) return `<div class="crumb"><a href="#/catalogo">Catálogo</a></div>` + vazio('car', 'Veículo não encontrado', 'Ele pode ter sido arquivado ou removido.', '<a class="btn primary" href="#/catalogo">Voltar ao catálogo</a>');
  if (tab) fichaTab = tab;
  const loc = locadora(v.locadoraId), planos = v.planos, pl = planos[planoSel] || planoPrincipal(v);
  const fotos = midiasDe(id).filter(m => m.tipo === 'foto'), g = k => grupoVideos(id, k);
  const n3d = midiasDe(id).filter(m => m.tipo === 'giro' || m.tipo === 'modelo3d').length;
  const abas = [['fotos', 'Fotos', fotos.length], ['giro', 'Visão 360° / 3D', n3d], ['curtos', 'Vídeos curtos', curtosDe(v).length], ['externos', 'Vídeos externos', g('externos').length], ['internos', 'Vídeos internos', g('internos').length], ['clientes', 'Vídeos de clientes', g('clientes').length]];
  const falt = camposFaltando(v);
  return `<div class="crumb"><a href="#/catalogo">Catálogo</a>${ico('chevron', 'sm')}<span>${esc(nomeVeiculo(v))}</span></div>
  <section class="card ficha-hero"><div class="vimg">${imgDe(fotoPrincipal(v), nomeVeiculo(v))}</div>
    <div class="ficha-info">
      <div class="row">${v.categoria ? `<span class="tag blue">${esc(nomeCatVeic(v.categoria))}</span>` : ''}${loc ? `<a class="tag" href="#/locadora/${loc.id}">${esc(loc.nome)}</a>` : '<span class="tag">Locadora não informada</span>'}${v.demo ? '<span class="tag demo">DEMONSTRAÇÃO</span>' : ''}</div>
      <div><div class="brand-l muted small">${esc(v.marca)}</div><h1>${esc(v.modelo)}</h1><div class="muted">${esc(v.versao || 'Versão não informada')}${v.ano ? ' · ' + esc(v.ano) : ''}</div></div>
      <div class="plano-box">
        ${planos.length ? planos.map((p, i) => `<div class="plano-opt ${planos[planoSel] === p || (!planos[planoSel] && i === 0) ? 'on' : ''}" data-act="plano" data-i="${i}" role="button" tabindex="0"><b>${brl(p.mensalidade)}</b><span class="small muted">${p.prazo ? p.prazo + ' meses' : 'prazo n/i'} · ${p.km ? Number(p.km).toLocaleString('pt-BR') + ' km/mês' : 'franquia n/i'}</span></div>`).join('') : `<div class="small muted">Nenhum plano cadastrado. Mensalidade, prazo e franquia: <b>${NI}</b>.</div>`}
        ${pl && (pl.taxas || pl.condicoes) ? `<div class="xs muted">${esc([pl.taxas && 'Taxas: ' + pl.taxas, pl.condicoes].filter(Boolean).join(' · '))}</div>` : ''}
      </div>
      <div class="row"><button class="btn primary" data-act="msgVeiculo" data-id="${v.id}">${ico('message', 'sm')} Gerar mensagem</button>
        <button class="btn" data-act="copiarLinkVeiculo" data-id="${v.id}">${ico('link', 'sm')} Copiar link</button>${favBtn('veiculos', v.id)}
        <a class="btn ghost" href="#/clove?v=${v.id}">${ico('sparkles', 'sm')} Perguntar ao Clove</a>${isAdmin() ? `<button class="btn ghost" data-act="editarVeiculo" data-id="${v.id}">${ico('edit', 'sm')} Editar</button>` : ''}</div>
      ${falt.length ? `<div class="xs muted">${ico('info', 'sm')} Ficha incompleta: ${esc(falt.join(', '))}.</div>` : ''}
    </div></section>

  <div class="tabs" role="tablist">${abas.map(([k, n, c]) => `<button role="tab" class="${fichaTab === k ? 'on' : ''}" data-act="fichaTab" data-tab="${k}" data-id="${id}">${n}<span class="n">${c}</span></button>`).join('')}</div>
  <div id="fichaMidia">${fichaMidia(v)}</div>

  <div class="grid g-2" style="margin-top:28px">
    <section class="card pad"><h2>Dados técnicos</h2><div class="src-note">${ico('shield', 'sm')} Informações do fabricante${v.fabricanteFonte ? ' — fonte: ' + esc(v.fabricanteFonte) : ' — fonte não informada'}</div>
      <div class="spec-grid">${specRows([['Marca', v.marca], ['Modelo', v.modelo], ['Versão', v.versao], ['Ano/modelo', v.ano], ['Motorização', v.motor], ['Potência', v.potencia], ['Câmbio', v.cambio], ['Combustível', v.combustivel], ['Consumo', v.consumo], ['Portas', v.portas], ['Passageiros', v.lugares], ['Porta-malas', v.portaMalas], ['Dimensões', v.dimensoes]])}</div>
      ${listaChips('Principais equipamentos', v.equipamentos)}${listaChips('Conforto', v.conforto)}${listaChips('Segurança', v.seguranca)}${listaChips('Conectividade', v.conectividade)}
      ${v.comparacao ? `<h3 style="margin-top:14px">Para comparação</h3><p class="small">${esc(v.comparacao)}</p>` : ''}</section>
    <section class="card pad"><h2>Dados da assinatura</h2><div class="src-note">${ico('building', 'sm')} Condições comerciais da locadora — não são dados do fabricante</div>${avisoPreco(v.locadoraId, true)}
      <div class="spec-grid" style="grid-template-columns:1fr">${specRows([['Locadora', loc?.nome], ['Mensalidade', pl?.mensalidade != null ? brl(pl.mensalidade) : null], ['Prazo contratual', pl?.prazo ? pl.prazo + ' meses' : null], ['Franquia de km', pl?.km ? Number(pl.km).toLocaleString('pt-BR') + ' km/mês' : null], ['Disponibilidade', v.disponibilidade], ['Taxas adicionais', pl?.taxas], ['Condições específicas', pl?.condicoes || v.condicoes], ['Última atualização', v.atualizadoEm ? dataBR(v.atualizadoEm) : null], ['Segmento na locadora', v.segmento], ['Fonte da informação', v.fonte]])}</div>
      ${v.fichaUrl ? `<a class="btn sm" style="margin-top:12px" target="_blank" rel="noopener" href="${esc(v.fichaUrl)}">${ico('external', 'sm')} Ver preço e plano na ${esc(loc?.nome || 'locadora')}</a>` : ''}
      ${loc?.catalogoUrl ? `<a class="btn sm" style="margin-top:12px" target="_blank" rel="noopener" href="${esc(loc.catalogoUrl)}">${ico('external', 'sm')} Conferir no catálogo da ${esc(loc.nome)}</a>` : ''}</section>
  </div>`;
}
const specRows = rows => rows.map(([k, v]) => `<div class="spec-row"><span>${k}</span><span>${val(v) != null ? esc(v) : `<span class="ni" style="font-weight:400">${NI}</span>`}</span></div>`).join('');
const listaChips = (t, l) => (l && l.length) ? `<h3 style="margin-top:14px">${t}</h3><div class="lista-eq" style="margin-top:6px">${l.map(x => `<span class="tag">${esc(x)}</span>`).join('')}</div>` : '';

let curtoClasse = 'todos';
const curtosFiltrados = v => curtoClasse === 'todos' ? curtosDe(v) : curtosDe(v).filter(x => x.classe === curtoClasse);
const nomeClasseCurto = k => (CLASSES_CURTO.find(c => c[0] === k) || [])[1] || k;
const nomeArquivoCurto = (v, x) => `${v.marca} ${v.modelo} ${(CLASSES_CURTO.find(c => c[0] === x.classe) || [])[2] || 'video'}.mp4`;
function cardCurto(v, x) {
  return `<article class="card curto"><button class="curto-thumb" data-act="curtoPlay" data-vid="${v.id}" data-id="${x.id}" aria-label="Assistir: ${esc(x.titulo)}"><img loading="lazy" src="https://i.ytimg.com/vi/${x.id}/hqdefault.jpg" alt=""><span class="dur">${x.dur} s</span><span class="play">${ico('play')}</span></button>
    <div class="curto-b"><span class="tag blue">${esc(nomeClasseCurto(x.classe))}</span><h4>${esc(x.titulo)}</h4><div class="xs muted">${esc(x.canal)} · ${dataBR(x.data)}</div>
    <div class="row"><button class="btn sm primary" data-act="curtoPlay" data-vid="${v.id}" data-id="${x.id}">${ico('play', 'sm')} Assistir</button><a class="btn sm" target="_blank" rel="noopener" href="https://www.youtube.com/shorts/${x.id}">${ico('external', 'sm')} YouTube</a><button class="btn sm" data-act="copiarTexto" data-t="https://www.youtube.com/shorts/${x.id}">${ico('link', 'sm')} Copiar link</button></div></div></article>`;
}
function viewCurtos(v) {
  const todos = curtosDe(v);
  if (!todos.length) return vazio('video', 'Nenhum vídeo curto encontrado', 'Ainda não achamos Shorts deste modelo. Use as outras abas ou envie um arquivo pela Administração.', isAdmin() ? `<button class="btn primary" data-act="novaMidia" data-vid="${v.id}">Adicionar vídeo</button>` : '');
  const chips = [['todos', 'Todos', todos.length], ...CLASSES_CURTO.map(([k, n]) => [k, n, todos.filter(x => x.classe === k).length])].filter(([k, , n]) => k === 'todos' || n)
    .map(([k, n, c]) => `<button class="cchip ${curtoClasse === k ? 'on' : ''}" data-act="curtoClasse" data-k="${k}">${n}<span class="n">${c}</span></button>`).join('');
  const l = curtosFiltrados(v);
  return `<div class="infobox">${ico('info', 'sm')} Vídeos curtos (até 90 s) do YouTube, separados pelo título. São de terceiros e servem de <b>referência</b>: assista aqui; para mandar ao cliente, use o arquivo que você tiver autorização de usar (envie em Administração → Mídias e o Hub vincula pelo nome).</div>
    <div class="row cchips">${chips}</div><div class="grid g-curtos">${l.map(x => cardCurto(v, x)).join('')}</div>`;
}
function abrirPlayerCurto(vid, id) {
  const v = veiculo(vid), lista = v ? curtosFiltrados(v) : [], i = lista.findIndex(x => x.id === id), x = lista[i]; if (!x) return;
  const ant = lista[i - 1], prox = lista[i + 1];
  abrirModal(`<div class="viewer curto-view"><div class="stage"><iframe src="https://www.youtube-nocookie.com/embed/${x.id}?autoplay=1&rel=0&playsinline=1" title="${esc(x.titulo)}" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen></iframe></div><div class="side-i">
    <div class="row"><h2 style="flex:1">${esc(x.titulo)}</h2><button class="icon-btn" data-act="fecharModal" aria-label="Fechar">${ico('x', 'sm')}</button></div>
    <div class="row"><span class="tag blue">${esc(nomeClasseCurto(x.classe))}</span><span class="tag">${x.dur} s</span></div>
    <div class="small muted">${esc(x.canal)} · ${dataBR(x.data)}<br>${esc(nomeVeiculo(v))}</div>
    <div class="acts"><div class="row"><button class="btn" ${ant ? `data-act="curtoPlay" data-vid="${vid}" data-id="${ant.id}"` : 'disabled'}>← Anterior</button><button class="btn" ${prox ? `data-act="curtoPlay" data-vid="${vid}" data-id="${prox.id}"` : 'disabled'}>Próximo →</button><span class="xs muted">${i + 1} de ${lista.length}</span></div>
      <a class="btn primary" target="_blank" rel="noopener" href="https://www.youtube.com/shorts/${x.id}">${ico('external', 'sm')} Abrir no YouTube</a>
      <button class="btn" data-act="copiarTexto" data-t="https://www.youtube.com/shorts/${x.id}">${ico('link', 'sm')} Copiar link</button>
      <button class="btn" data-act="copiarTexto" data-t="${esc(nomeArquivoCurto(v, x))}">${ico('copy', 'sm')} Copiar nome de arquivo sugerido</button>
      <div class="xs muted">Se o vídeo não tocar aqui, o canal bloqueou o player externo: use “Abrir no YouTube”. O nome sugerido faz o Hub vincular o arquivo ao carro certo quando você enviar.</div></div></div></div>`, { tam: 'wide' });
}

function fichaMidia(v) {
  if (fichaTab === 'curtos') return viewCurtos(v);
  if (fichaTab === 'fotos') {
    const fotos = midiasDe(v.id).filter(m => m.tipo === 'foto');
    if (!fotos.length) return vazio('image', 'Sem fotos deste veículo', 'Envie fotos pela Administração ou importe o ZIP de Cores.', isAdmin() ? `<button class="btn primary" data-act="novaMidia" data-vid="${v.id}">Adicionar mídia</button>` : '');
    const secs = {}; fotos.forEach(m => (secs[m.categoria] = secs[m.categoria] || []).push(m));
    return Object.entries(secs).map(([c, l]) => `<h3 style="margin:14px 0 10px">${esc(nomeCat(c))}</h3><div class="grid g-media">${l.map(m => cardMidia(m)).join('')}</div>`).join('');
  }
  if (fichaTab === 'giro') {
    const g = midiasDe(v.id).filter(m => m.tipo === 'giro' || m.tipo === 'modelo3d');
    return g.length ? `<div class="grid g-media">${g.map(m => cardMidia(m)).join('')}</div>` : vazio('refresh', 'Sem visão 360° deste veículo', 'Envie uma sequência de fotos em volta do carro (24 a 36 quadros) ou um modelo 3D (.glb) e o atendente poderá girar o carro com o mouse.', isAdmin() ? `<button class="btn primary" data-act="novaMidia" data-vid="${v.id}">Adicionar giro 360°</button>` : '');
  }
  const l = grupoVideos(v.id, fichaTab);
  const refs = fichaTab === 'clientes' ? 0 : S.midias.filter(m => ehSugerida(m) && midiaTemVeic(m, v.id) && m.tipo === 'video').length;
  const nota = refs ? `<div class="infobox" style="margin-top:14px">${ico('info', 'sm')} ${refs} referência(s) do YouTube ${S.config.mostrarSugeridos ? 'visível(is)' : 'oculta(s)'}: só para consulta, <b>não baixáveis</b>. <button class="btn" data-act="toggleSugeridos">${S.config.mostrarSugeridos ? 'Ocultar' : 'Mostrar'}</button></div>` : '';
  if (!l.length) return vazio('video', 'Nenhum vídeo para baixar nesta aba', fichaTab === 'clientes' ? 'Nenhum vídeo de cliente para este modelo.' : 'Ainda não há vídeos deste veículo na biblioteca.', isAdmin() ? `<button class="btn primary" data-act="novaMidia" data-vid="${v.id}">Adicionar vídeo</button>` : '') + nota;
  return `<div class="grid g-media">${l.map(m => cardMidia(m)).join('')}</div>` + nota;
}

/* ===== LOCADORAS ===== */
function viewLocadoras() {
  return `<div class="page-head"><div><h1>Locadoras</h1><p>Parceiras cadastradas e os modelos vinculados a cada uma.</p></div><span class="sp"></span>${isAdmin() ? `<button class="btn primary" data-act="novaLocadora">${ico('plus', 'sm')} Nova locadora</button>` : ''}</div>
  ${S.locadoras.length ? `<div class="grid g-loc">${S.locadoras.map(cardLocadora).join('')}</div>` : vazio('building', 'Nenhuma locadora', 'Cadastre a primeira locadora na Administração.')}`;
}
function viewLocadora(id) {
  const l = locadora(id); if (!l) return vazio('building', 'Locadora não encontrada', '', '<a class="btn" href="#/locadoras">Voltar</a>');
  const vs = veiculosAtivos().filter(v => v.locadoraId === id), ms = S.midias.filter(m => m.locadoraId === id && !m.arquivado && !bloqueada(m));
  return `<div class="crumb"><a href="#/locadoras">Locadoras</a>${ico('chevron', 'sm')}<span>${esc(l.nome)}</span></div>
  <div class="card pad"><div class="row"><h1>${esc(l.nome)}</h1>${l.demo ? '<span class="tag demo">DEMONSTRAÇÃO</span>' : ''}<span class="sp"></span>${isAdmin() ? `<button class="btn sm" data-act="editarLocadora" data-id="${l.id}">${ico('edit', 'sm')} Editar</button>` : ''}</div>
    <p class="muted">${esc(l.descricao || 'Sem descrição cadastrada.')}</p>
    <div class="spec-grid">${specRows([['Site oficial', l.site], ['Catálogo de assinatura', l.catalogoUrl], ['Contato comercial', l.contato], ['Observações internas', l.obs], ['Atualizado em', dataBR(l.atualizadoEm)]])}</div>
    <div class="row" style="margin-top:12px">${l.site ? `<a class="btn sm" target="_blank" rel="noopener" href="${esc(l.site)}">${ico('external', 'sm')} Site</a>` : ''}${l.catalogoUrl ? `<a class="btn sm" target="_blank" rel="noopener" href="${esc(l.catalogoUrl)}">${ico('external', 'sm')} Catálogo</a>` : ''}<a class="btn sm" href="#/catalogo?loc=${l.id}">Filtrar no catálogo</a></div></div>
  <div class="sec-head"><h2>Veículos vinculados (${vs.length})</h2></div>
  ${vs.length ? `<div class="grid g-veic">${vs.map(cardVeiculo).join('')}</div>` : vazio('car', 'Nenhum veículo vinculado', 'Vincule veículos a esta locadora editando a ficha deles.')}
  <div class="sec-head"><h2>Materiais específicos (${ms.length})</h2></div>
  ${ms.length ? `<div class="grid g-media">${ms.map(m => cardMidia(m)).join('')}</div>` : '<p class="muted">Nenhum material vinculado diretamente a esta locadora.</p>'}`;
}

/* ===== BIBLIOTECA ===== */
let B = { q: '', cat: '', loc: '', vid: '', tipo: '', ord: 'recente', modo: 'grade', escopo: 'todos' };
function viewBiblioteca(params) {
  if (params) { for (const [k, v] of params) if (k in B) B[k] = v; }
  return `<div class="page-head"><div><h1>Biblioteca de vídeos</h1><p>Fotos e vídeos de todos os veículos, tutoriais de atendimento e materiais das locadoras.</p></div><span class="sp"></span>${isAdmin() ? `<button class="btn" data-act="autoVincular" title="Liga cada vídeo ao carro citado no nome do arquivo">${ico('link', 'sm')} Vincular pelo nome</button><button class="btn primary" data-act="novaMidia">${ico('upload', 'sm')} Adicionar mídia</button>` : ''}</div>
  <div class="card pad" style="margin-bottom:18px"><div class="form-grid" style="grid-template-columns:2fr 1fr 1fr 1fr 1fr">
    <label class="f">Busca<input type="search" data-b="q" value="${esc(B.q)}" placeholder="Título, modelo, palavra-chave"></label>
    <label class="f">Categoria<select data-b="cat">${opts(categoriasMidia(), B.cat)}</select></label>
    <label class="f">Locadora<select data-b="loc">${opts(S.locadoras.map(l => [l.id, l.nome]), B.loc)}</select></label>
    <label class="f">Veículo<select data-b="vid">${opts(veiculosAtivos().map(v => [v.id, nomeVeiculo(v)]), B.vid)}<option value="_sem" ${B.vid === '_sem' ? 'selected' : ''}>Sem veículo</option></select></label>
    <label class="f">Tipo<select data-b="tipo">${opts([['video', 'Vídeo'], ['foto', 'Foto'], ['giro', 'Giro 360°'], ['modelo3d', 'Modelo 3D']], B.tipo)}</select></label></div>
    <div class="row" style="margin-top:12px"><div class="chips">${[['todos', 'Tudo'], ['comercial', 'Comerciais de veículos'], ['apoio', 'Apoio operacional']].map(([k, n]) => `<button class="chip ${B.escopo === k ? 'on' : ''}" data-act="escopo" data-k="${k}">${n}</button>`).join('')}</div><span class="sp"></span>
      <select data-b="ord" style="width:auto"><option value="recente" ${B.ord === 'recente' ? 'selected' : ''}>Mais recentes</option><option value="nome" ${B.ord === 'nome' ? 'selected' : ''}>Nome</option></select>
      <div class="seg"><button class="${B.modo === 'grade' ? 'on' : ''}" data-act="modoBib" data-k="grade" aria-label="Grade">${ico('grid', 'sm')}</button><button class="${B.modo === 'lista' ? 'on' : ''}" data-act="modoBib" data-k="lista" aria-label="Lista">${ico('list', 'sm')}</button></div></div></div>
  <div id="bibRes"></div>`;
}
function pintarBiblioteca() {
  const box = $('#bibRes'); if (!box) return;
  const q = norm(B.q);
  let l = S.midias.filter(m => !m.arquivado).filter(m => {
    if (B.cat && m.categoria !== B.cat) return false; if (B.loc && m.locadoraId !== B.loc && !midiaVeics(m).some(i => veiculo(i)?.locadoraId === B.loc)) return false;
    if (B.vid === '_sem' ? m.veiculoId : (B.vid && !midiaTemVeic(m, B.vid))) return false; if (B.tipo && m.tipo !== B.tipo) return false;
    if (B.escopo === 'comercial' && !CATS_COMERCIAIS.includes(m.categoria)) return false; if (B.escopo === 'apoio' && !CATS_APOIO.includes(m.categoria)) return false;
    if (q && !q.split(/\s+/).every(t => norm([m.titulo, m.descricao, m.nomeOriginal, (m.tags || []).join(' '), nomeVeiculo(veiculo(m.veiculoId)), nomeCat(m.categoria), locadora(m.locadoraId)?.nome].join(' ')).includes(t))) return false;
    return true;
  });
  l.sort(B.ord === 'nome' ? (a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR', { numeric: true }) : (a, b) => b.criadoEm.localeCompare(a.criadoEm));
  const hist = S.hist.midias.map(h => midia(h.id)).filter(Boolean).slice(0, 6);
  box.innerHTML = `<div class="small muted" style="margin-bottom:10px">${l.length} item(ns)</div>` + (l.length ? (B.modo === 'grade' ? `<div class="grid g-media">${l.slice(0, 120).map(m => cardMidia(m)).join('')}</div>` : `<div class="grid" style="gap:10px">${l.slice(0, 200).map(m => cardMidia(m, 'lista')).join('')}</div>`) + (l.length > 120 && B.modo === 'grade' ? '<p class="muted small">Mostrando os 120 primeiros. Refine a busca para ver o restante.</p>' : '') :
    vazio('video', S.midias.length ? 'Nada encontrado' : 'Biblioteca vazia', S.midias.length ? 'Ajuste a busca ou os filtros.' : 'Importe os ZIPs de BANCOS e Cores, ou envie arquivos pela Administração.', !S.midias.length && isAdmin() ? '<a class="btn primary" href="#/admin/importar">Importar materiais</a>' : ''))
    + (hist.length ? `<div class="sec-head"><h2>Acessados recentemente</h2></div><div class="grid g-media">${hist.map(m => cardMidia(m)).join('')}</div>` : '');
  hidratar(box);
}

/* ===== CLIENTES E RETIRADAS ===== */
let C = { vid: '', loc: '', cat: '', de: '', ate: '' };
function viewClientes() {
  return `<div class="page-head"><div><h1>Clientes e retiradas</h1><p>Vídeos de clientes recebendo o veículo. Só circulam os que têm autorização de uso.</p></div><span class="sp"></span>${isAdmin() ? `<button class="btn primary" data-act="novoCliente">${ico('plus', 'sm')} Novo vídeo de cliente</button>` : ''}</div>
  ${isAdmin() ? `<div class="upl" id="cliDrop" style="margin-bottom:16px" role="button" tabindex="0" data-act="novoCliente"><div style="color:var(--blue2)">${ico('upload', 'lg')}</div><b>Arraste aqui os vídeos de clientes retirando o veículo 0 km</b><div class="muted small" style="margin-top:4px">ou clique para escolher. Depois você define veículo, locadora e autorização de uso — vale para todos os arquivos de uma vez.</div></div>` : ''}
  <div class="infobox" style="margin-bottom:16px">${ico('shield', 'sm')} Vídeos sem autorização aparecem como <b>restritos</b> e não podem ser reproduzidos, baixados nem compartilhados${isAdmin() ? ' (você, como administrador, consegue abri-los para revisão)' : ''}.</div>
  <div class="card pad" style="margin-bottom:18px"><div class="form-grid" style="grid-template-columns:repeat(5,1fr)">
    <label class="f">Veículo<select data-c="vid">${opts(veiculosAtivos().map(v => [v.id, nomeVeiculo(v)]), C.vid)}</select></label>
    <label class="f">Locadora<select data-c="loc">${opts(S.locadoras.map(l => [l.id, l.nome]), C.loc)}</select></label>
    <label class="f">Categoria<select data-c="cat">${opts([['retirada', 'Retirada / entrega'], ['depoimento', 'Depoimento']], C.cat)}</select></label>
    <label class="f">Retirada de<input type="date" data-c="de" value="${C.de}"></label><label class="f">até<input type="date" data-c="ate" value="${C.ate}"></label></div></div>
  <div id="cliRes"></div>`;
}
function pintarClientes() {
  const box = $('#cliRes'); if (!box) return;
  const l = S.midias.filter(m => !m.arquivado && m.tipo === 'video' && m.cliente).filter(m => {
    const v = veiculo(m.veiculoId), d = m.cliente.data || '';
    if (C.vid && !midiaTemVeic(m, C.vid)) return false; if (C.loc && m.locadoraId !== C.loc && v?.locadoraId !== C.loc) return false; if (C.cat && m.categoria !== C.cat) return false;
    if (C.de && (!d || d < C.de)) return false; if (C.ate && (!d || d > C.ate)) return false; return true;
  }).sort((a, b) => (b.cliente.data || '').localeCompare(a.cliente.data || ''));
  box.innerHTML = l.length ? `<div class="grid g-media">${l.map(m => cardMidia(m)).join('')}</div>` : vazio('users', 'Nenhum vídeo de cliente', 'Quando houver vídeos de retirada ou depoimentos cadastrados, eles aparecem aqui.', isAdmin() ? `<button class="btn primary" data-act="novoCliente">Cadastrar vídeo de cliente</button>` : '');
  hidratar(box);
}

/* ===== MATERIAIS DE ATENDIMENTO ===== */
let M = { tpl: '', vid: '', plano: 0, mid: '', texto: null };
function viewMensagens(params) {
  if (params) { const t = params.get('tpl'); if (t) M.tpl = t; const v = params.get('v'); if (v) { M.vid = v; M.plano = 0; } const m = params.get('m'); if (m) { M.mid = m; const mm = midia(m); if (mm?.veiculoId) M.vid = mm.veiculoId; } M.texto = null; }
  const tpls = S.templates.filter(t => !t.arquivado); if (!M.tpl || !tpls.find(t => t.id === M.tpl)) M.tpl = tpls[0]?.id || '';
  return `<div class="page-head"><div><h1>Materiais de atendimento</h1><p>Monte a mensagem para o cliente a partir do veículo e do vídeo. Nada é enviado automaticamente: você copia e envia.</p></div></div>
  <div class="msg-lay"><div class="card pad" style="display:grid;gap:14px">
    <label class="f">Template<select data-m="tpl">${tpls.map(t => `<option value="${t.id}" ${M.tpl === t.id ? 'selected' : ''}>${esc(t.nome)}</option>`).join('')}</select></label>
    <label class="f">Veículo<select data-m="vid">${opts(veiculosAtivos().map(v => [v.id, nomeVeiculo(v)]), M.vid, 'Selecione...')}</select></label>
    <div id="msgPlano"></div><div id="msgVideo"></div></div>
    <div class="card pad" style="display:grid;gap:12px" id="msgOut"></div></div>
  ${isAdmin() ? `<div class="sec-head"><div><h2>Gerenciar templates</h2><p>Campos disponíveis: ${Object.keys(ROTULO_CAMPO).map(k => `<code>{{${k}}}</code>`).join(' ')}</p></div><span class="sp"></span><button class="btn primary" data-act="novoTemplate">${ico('plus', 'sm')} Novo template</button></div>${tabelaTemplates()}` : ''}`;
}
function pintarMensagens() {
  const v = veiculo(M.vid), tpl = S.templates.find(t => t.id === M.tpl);
  if (!$('#msgOut')) return;
  const planos = v ? v.planos : [];
  $('#msgPlano').innerHTML = planos.length ? `<label class="f">Plano<select data-m="plano">${planos.map((p, i) => `<option value="${i}" ${M.plano == i ? 'selected' : ''}>${brl(p.mensalidade)} · ${p.prazo || '?'} meses · ${p.km ? Number(p.km).toLocaleString('pt-BR') : '?'} km</option>`).join('')}</select></label>` : '';
  const vids = v ? midiasDe(v.id).filter(m => m.tipo === 'video' && compartilhavel(m)) : [];
  if (M.mid && !vids.find(m => m.id === M.mid) && !midia(M.mid)) M.mid = '';
  $('#msgVideo').innerHTML = v ? `<label class="f">Vídeo <span class="xs">(opcional)</span><select data-m="mid"><option value="">Sem vídeo</option>${vids.map(m => `<option value="${m.id}" ${M.mid === m.id ? 'selected' : ''}>${esc(m.titulo)}</option>`).join('')}</select></label>${vids.length ? '' : '<div class="xs muted" style="margin-top:6px">Nenhum vídeo liberado para este veículo.</div>'}` : '';
  if (!tpl) { $('#msgOut').innerHTML = vazio('message', 'Sem templates ativos', 'Peça a um administrador para criar um template.'); return; }
  const m = M.mid ? midia(M.mid) : null;
  const r = preencher(tpl.corpo, ctxMensagem({ v, plano: planos[M.plano], m }));
  const needsVideo = /\{\{\s*link_video\s*\}\}/.test(tpl.corpo) && !m, needsVeic = !v;
  const texto = M.texto ?? r.texto;
  $('#msgOut').innerHTML = `<div class="row"><h2>Mensagem</h2><span class="sp"></span>${M.texto != null ? '<button class="btn sm ghost" data-act="resetMsg">Refazer do template</button>' : ''}</div>
    ${/mensalidade|R\$/.test(texto) || /\{\{\s*mensalidade/.test(tpl.corpo) ? avisoPreco(v?.locadoraId, true) : ''}
    ${needsVeic ? `<div class="warnbox">Selecione um veículo para preencher os campos.</div>` : ''}
    ${needsVideo && v ? `<div class="warnbox">Este template usa um vídeo, mas nenhum foi selecionado — a linha do link foi omitida.</div>` : ''}
    ${r.faltando.length && v ? `<div class="warnbox">Sem dados no cadastro (linhas omitidas): ${r.faltando.map(k => ROTULO_CAMPO[k] || k).join(', ')}.</div>` : ''}
    ${m && linkMidiaInterno(m) ? `<div class="infobox">O link deste vídeo é interno do Hub e só abre neste navegador enquanto o sistema não estiver hospedado. Para link público, cadastre o vídeo por URL ou configure a URL pública em Administração.</div>` : ''}
    <textarea id="msgTxt" aria-label="Mensagem">${esc(texto)}</textarea>
    <div class="row"><button class="btn primary" data-act="copiarMsg">${ico('copy', 'sm')} Copiar texto</button>
      <button class="btn" data-act="copiarLinkMsg" ${m || v ? '' : 'disabled'}>${ico('link', 'sm')} Copiar link</button>
      <button class="btn" data-act="abrirMaterial" ${m || v ? '' : 'disabled'}>${ico('external', 'sm')} Abrir material</button></div>`;
}
function tabelaTemplates() {
  return `<div class="card tbl-wrap"><table class="table"><thead><tr><th>Nome</th><th>Tipo</th><th>Usos</th><th></th></tr></thead><tbody>${S.templates.map(t => `<tr style="${t.arquivado ? 'opacity:.55' : ''}"><td><b>${esc(t.nome)}</b> ${t.arquivado ? '<span class="tag">Arquivado</span>' : ''}</td><td>${esc(t.tipo)}</td><td>${S.hist.tplUso[t.id] || 0}</td><td style="text-align:right;white-space:nowrap"><button class="btn sm" data-act="editarTemplate" data-id="${t.id}">Editar</button> <button class="btn sm" data-act="duplicarTemplate" data-id="${t.id}">Duplicar</button> <button class="btn sm danger" data-act="arquivarTemplate" data-id="${t.id}">${t.arquivado ? 'Restaurar' : 'Arquivar'}</button></td></tr>`).join('')}</tbody></table></div>`;
}

/* ===== CLOVE (tela) ===== */
function viewClove(params) {
  if (params?.get('v')) { S.clove.foco = [params.get('v')]; salvar(); }
  const modo = Clove.modo(), h = S.clove.historico;
  const foco = (S.clove.foco || []).map(veiculo).filter(Boolean);
  return `<div class="page-head"><div><h1>Clove Assistente</h1><p>Responde com base nos veículos, locadoras e mídias cadastrados.</p></div><span class="sp"></span>
    <span class="mode-pill ${modo === 'api' ? 'on' : 'demo'}">${ico(modo === 'api' ? 'check' : 'info', 'sm')} ${modo === 'api' ? 'API conectada' : 'Modo demonstração — sem IA externa'}</span></div>
  <div class="chat-lay"><div class="card chat"><div class="chat-log" id="chatLog">${h.length ? h.map(msgHTML).join('') : msgHTML({ papel: 'bot', texto: 'Olá! Sou o Clove. Pergunte sobre carros, prazos, vídeos ou peça uma mensagem para o cliente. Só afirmo o que está cadastrado — quando não achar, eu aviso.' })}</div>
    <div class="sugs">${Clove.perguntasSugeridas().map(p => `<button class="chip" data-act="sugestao" data-q="${esc(p)}">${esc(p)}</button>`).join('')}</div>
    <form class="chat-in" data-form="clove"><input type="text" name="q" placeholder="Pergunte ao Clove..." aria-label="Pergunta ao Clove" autocomplete="off"><button class="btn primary" type="submit">${ico('send', 'sm')} Enviar</button></form></div>
  <aside class="card pad" style="align-self:start;display:grid;gap:10px"><h3>Contexto da conversa</h3>
    ${foco.length ? foco.map(v => `<a class="mini" href="#/veiculo/${v.id}"><div class="t">${imgDe(fotoPrincipal(v))}</div><div><b>${esc(nomeVeiculo(v))}</b><small>Veículo em foco</small></div></a>`).join('') + '<button class="btn sm" data-act="limparFoco">Limpar foco</button>' : '<p class="small muted">Quando você citar um carro, ele vira o foco e dá para dizer "esse veículo".</p>'}
    <button class="btn sm" data-act="limparChat">Limpar histórico</button>
    ${modo === 'demo' ? '<div class="xs muted">Para ativar a IA, informe o endereço da API em Administração → Clove.</div>' : ''}</aside></div>`;
}
function msgHTML(m) {
  if (m.papel === 'user') return `<div class="msg user"><div class="av">${esc((S.config.usuario || 'U')[0])}</div><div class="bubble">${esc(m.texto)}</div></div>`;
  const rich = esc(m.texto || '').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').split('\n').map(l => `<p>${l}</p>`).join('');
  const vs = (m.veiculos || []).map(veiculo).filter(Boolean), ms = (m.midias || []).map(midia).filter(Boolean);
  return `<div class="msg bot"><div class="av">${ico('sparkles', 'sm')}</div><div class="bubble">${m.aviso ? `<div class="warnbox" style="margin-bottom:8px">${esc(m.aviso)}</div>` : ''}${rich}
    ${m.tabela ? `<div class="tbl-wrap"><table class="cmp"><thead><tr>${m.tabela.cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${m.tabela.rows.map(r => `<tr>${r.map((c, i) => `<td class="${i && !val(c) ? 'ni' : ''}">${i === 0 ? '<b>' + esc(c) + '</b>' : esc(val(c) ?? NI)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : ''}
    ${m.mensagem ? `<div class="msg-box">${esc(m.mensagem)}</div><div class="mini-acts"><button class="btn sm" data-act="copiarTexto" data-t="${esc(m.mensagem)}">${ico('copy', 'sm')} Copiar mensagem</button></div>` : ''}
    ${vs.length || ms.length ? `<div class="cards">${vs.map(v => `<div class="mini"><div class="t">${imgDe(fotoPrincipal(v))}</div><div style="min-width:0"><b>${esc(nomeVeiculo(v))}</b><small>${precoMin(v) != null ? 'a partir de ' + brl(precoMin(v)) : 'mensalidade n/i'}</small><div class="mini-acts"><a class="btn sm" href="#/veiculo/${v.id}">Abrir veículo</a>${m.escolha ? `<button class="btn sm" data-act="usarVeiculo" data-id="${v.id}">Usar este</button>` : ''}</div></div></div>`).join('')}
      ${ms.map(x => `<div class="mini"><div class="t">${thumbMidia(x)}</div><div style="min-width:0"><b>${esc(x.titulo)}</b><small>${esc(nomeCat(x.categoria))}</small><div class="mini-acts"><button class="btn sm" data-act="abrirMidia" data-id="${x.id}">Localizar vídeo</button><button class="btn sm" data-act="copiarMsgMidia" data-id="${x.id}">Msg pronta</button></div></div></div>`).join('')}</div>` : ''}
    <div class="mini-acts" style="margin-top:8px"><button class="btn sm ghost" data-act="copiarTexto" data-t="${esc(m.texto || '')}">${ico('copy', 'sm')} Copiar resposta</button></div></div></div>`;
}

/* ===== FAVORITOS ===== */
function viewFavoritos() {
  const vs = S.favoritos.veiculos.map(veiculo).filter(Boolean), ms = S.favoritos.midias.map(midia).filter(Boolean);
  return `<div class="page-head"><div><h1>Favoritos</h1><p>Seus atalhos. Ficam salvos neste navegador.</p></div></div>
  <div class="sec-head"><h2>Veículos</h2></div>${vs.length ? `<div class="grid g-veic">${vs.map(cardVeiculo).join('')}</div>` : vazio('star', 'Nenhum veículo favorito', 'Use a estrela nos cards e na ficha do veículo.')}
  <div class="sec-head"><h2>Mídias</h2></div>${ms.length ? `<div class="grid g-media">${ms.map(m => cardMidia(m)).join('')}</div>` : vazio('star', 'Nenhuma mídia favorita', 'Use a estrela nos vídeos e fotos.')}`;
}

/* ===== VISUALIZADOR DE MÍDIA ===== */
function embedDe(url) {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/); if (yt) return { tipo: 'iframe', src: 'https://www.youtube.com/embed/' + yt[1] };
  const vm = url.match(/vimeo\.com\/(\d+)/); if (vm) return { tipo: 'iframe', src: 'https://player.vimeo.com/video/' + vm[1] };
  const dr = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/); if (dr) return { tipo: 'iframe', src: 'https://drive.google.com/file/d/' + dr[1] + '/preview' };
  if (/\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(url)) return { tipo: 'video', src: url };
  if (/\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(url)) return { tipo: 'img', src: url };
  return null;
}
function abrirViewer(id, info) {
  const m = midia(id); if (!m) return;
  registrarMidia(id);
  const v = veiculo(m.veiculoId), bl = bloqueada(m), a = AUTORIZACAO[m.autorizacao];
  let stage;
  if (bl) stage = `<div style="color:#fff;text-align:center;padding:40px">${ico('lock', 'lg')}<p>Vídeo restrito: uso comercial não liberado.</p></div>`;
  else if (m.origem === 'link') {
    const e = embedDe(m.url || '');
    stage = !e ? `<div style="color:#fff;text-align:center;padding:40px"><p>Este link não pode ser reproduzido aqui.</p><a class="btn primary" target="_blank" rel="noopener" href="${esc(m.url)}">${ico('external', 'sm')} Abrir link original</a></div>`
      : e.tipo === 'iframe' ? `<iframe id="vwEl" src="${esc(e.src)}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>` : e.tipo === 'video' ? `<video id="vwEl" controls autoplay playsinline src="${esc(e.src)}"></video>` : `<img id="vwEl" src="${esc(e.src)}" alt="${esc(m.titulo)}">`;
  } else if (m.tipo === 'giro') stage = `<div class="spin" id="spin" tabindex="0" aria-label="Arraste para girar o carro"><img id="spinImg" draggable="false" alt="${esc(m.titulo)}"><div class="spin-hint" id="spinHint">${ico('refresh', 'sm')} Arraste para girar</div><div class="spin-bar"><button class="icon-btn" data-act="spinAuto" aria-label="Girar automaticamente" title="Girar sozinho">${ico('play', 'sm')}</button><input type="range" id="spinRange" min="0" max="${(m.frames?.length || 1) - 1}" value="0" aria-label="Ângulo"></div></div>`;
  else if (m.tipo === 'modelo3d') stage = `<div id="m3d" style="color:#fff;padding:40px">Carregando modelo 3D…</div>`;
  else stage = m.tipo === 'video' ? `<video id="vwEl" controls autoplay playsinline data-vfid="${m.fileId}"></video>` : `<img id="vwEl" data-fid="${m.fileId}" alt="${esc(m.titulo)}">`;
  const dl = podeBaixar(m);
  setTimeout(() => { if (m.tipo === 'giro' && !bl) iniciarGiro(m); if (m.tipo === 'modelo3d' && !bl) iniciar3D(m); }, 0);
  abrirModal(`<div class="viewer"><div class="stage">${stage}</div><div class="side-i">
    <div class="row"><h2 style="flex:1">${esc(m.titulo)}</h2><button class="icon-btn" data-act="fecharModal" aria-label="Fechar">${ico('x', 'sm')}</button></div>
    <div class="row">${m.demo ? '<span class="tag demo">DEMO</span>' : ''}<span class="tag">${esc(nomeCat(m.categoria))}</span>${a && m.cliente ? `<span class="tag ${a[1]}">${a[0]}</span>` : ''}</div>
    ${m.descricao ? `<p class="small muted" style="margin:0">${esc(m.descricao)}</p>` : ''}
    ${v ? `<a href="#/veiculo/${v.id}" data-act="fecharModal">${ico('car', 'sm')} ${esc(nomeVeiculo(v))}</a>` : ''}
    ${bl ? '' : `<div class="acts">
      <div class="row"><button class="btn" data-act="ampliar">${ico('expand', 'sm')} Ampliar</button>${favBtn('midias', m.id)}<button class="btn" data-act="infoMidia" data-id="${m.id}">${ico('info', 'sm')} Informações</button></div>
      <button class="btn primary" data-act="copiarMsgMidia" data-id="${m.id}">${ico('message', 'sm')} Copiar mensagem pronta</button>
      <button class="btn" data-act="copiarLinkMidia" data-id="${m.id}">${ico('link', 'sm')} Copiar link</button>
      ${m.tipo === 'giro' ? '' : `<button class="btn" data-act="baixarMidia" data-id="${m.id}">${ico(dl ? 'download' : 'external', 'sm')} ${dl ? 'Baixar arquivo original' : 'Abrir link original'}</button>`}
      ${m.origem === 'link' && !dl ? '<div class="xs muted">Download direto indisponível para links externos — use o link original.</div>' : ''}
      ${v ? `<a class="btn" href="#/mensagens?v=${v.id}&m=${m.id}" data-act="fecharModal">${ico('message', 'sm')} Abrir em Materiais de atendimento</a>` : ''}</div>`}
    <div id="infoBox" ${info ? '' : 'hidden'}>${infoMidiaHTML(m)}</div></div></div>`, { tam: 'wide' });
}
function infoMidiaHTML(m) {
  const v = veiculo(m.veiculoId), a = AUTORIZACAO[m.autorizacao];
  return `<div class="spec-grid" style="grid-template-columns:1fr">${specRows([['Tipo', { video: 'Vídeo', foto: 'Foto', giro: 'Giro 360° (' + (m.frames?.length || 0) + ' quadros)', modelo3d: 'Modelo 3D' }[m.tipo]], ['Categoria', nomeCat(m.categoria)], ['Veículo', v && nomeVeiculo(v)], ['Origem', m.origem === 'link' ? 'Link externo' : (locadora(m.locadoraId)?.nome || 'Arquivo enviado ao Hub')], ['Arquivo original', m.nomeOriginal], ['Cadastrado em', dataBR(m.criadoEm)], ['Autorização de uso', a ? a[0] : null], ['Cliente', m.cliente?.nome], ['Data da retirada', m.cliente?.data && dataBR(m.cliente.data)], ['Tags', (m.tags || []).join(', ')]])}</div>`;
}

/* ===== giro 360° (sequência de quadros) e modelo 3D ===== */
let giroAuto = null;
async function iniciarGiro(m) {
  const root = $('#spin'), img = $('#spinImg'), range = $('#spinRange'); if (!root) return;
  const urls = []; for (const f of m.frames) urls.push(f.url || await fileURL(f.fileId));
  if (!$('#spin')) return; const N = urls.length; let i = 0, acc = 0, drag = false, lastX = 0, vel = 0, raf = null;
  urls.forEach(u => { const p = new Image(); p.src = u; });   // pré-carrega todos os quadros
  const show = n => { i = ((n % N) + N) % N; img.src = urls[i]; range.value = i; };
  const parar = () => { cancelAnimationFrame(raf); raf = null; clearInterval(giroAuto); giroAuto = null; };
  const inercia = () => { if (Math.abs(vel) < .02) return; acc += vel; vel *= .94; passos(); raf = requestAnimationFrame(inercia); };
  const passos = () => { const px = root.clientWidth / N; while (acc >= px) { show(i - 1); acc -= px; } while (acc <= -px) { show(i + 1); acc += px; } };
  const auto = () => { parar(); giroAuto = setInterval(() => { if (!document.body.contains(root)) return parar(); show(i + 1); }, 70); };
  show(0); auto();
  root.onpointerdown = e => { if (e.target.closest('.spin-bar')) return; drag = true; lastX = e.clientX; vel = 0; parar(); root.setPointerCapture(e.pointerId); $('#spinHint')?.remove(); root.style.cursor = 'grabbing'; };
  root.onpointermove = e => { if (!drag) return; const dx = e.clientX - lastX; lastX = e.clientX; acc += dx; vel = dx; passos(); };
  root.onpointerup = root.onpointercancel = () => { if (!drag) return; drag = false; root.style.cursor = ''; raf = requestAnimationFrame(inercia); };
  root.onkeydown = e => { if (e.key === 'ArrowLeft') { parar(); show(i + 1); } if (e.key === 'ArrowRight') { parar(); show(i - 1); } };
  range.oninput = () => { parar(); show(Number(range.value)); };
  root._auto = auto; root._parar = parar;
}
function iniciar3D(m) {
  const box = $('#m3d'); if (!box) return;
  const montar = async () => { const u = await fileURL(m.fileId); if (!$('#m3d')) return; box.outerHTML = `<model-viewer src="${u}" camera-controls auto-rotate shadow-intensity="1" touch-action="pan-y" style="width:100%;height:480px;background:transparent" alt="${esc(m.titulo)}"></model-viewer>`; };
  if (customElements.get('model-viewer')) return montar();
  const s = document.createElement('script'); s.type = 'module'; s.src = 'https://unpkg.com/@google/model-viewer@3.5.0/dist/model-viewer.min.js';
  s.onload = montar; s.onerror = () => { box.textContent = 'Não foi possível carregar o visualizador 3D (sem internet?).'; }; document.head.appendChild(s);
}

/* ===== aviso de preço (sempre com botão para o site oficial) ===== */
const SITES = { loc_localiza: ['Localiza', 'https://assinatura.localiza.com/carros'], loc_movida: ['Movida', 'https://www.movidacarroporassinatura.com.br/assinatura/busca'] };
function siteOficial(id) { const l = locadora(id); const d = SITES[id]; return l?.catalogoUrl ? [l.nome, l.catalogoUrl] : d; }
function avisoPreco(locId, compacto) {
  const ids = locId && siteOficial(locId) ? [locId] : ['loc_localiza', 'loc_movida'];
  return `<div class="aviso-preco ${compacto ? 'compacto' : ''}" role="note">${ico('alert', 'sm')}<div class="txt"><b>Valores de referência.</b> Os preços podem não ser exatos e já ter sido atualizados. <b>Confira sempre no site oficial</b> antes de passar ao cliente.</div>
    <div class="bts">${ids.map(i => { const s = siteOficial(i); return s ? `<a class="btn sm" target="_blank" rel="noopener" href="${esc(s[1])}">${ico('external', 'sm')} Conferir na ${esc(s[0])}</a>` : ''; }).join('')}</div></div>`;
}
