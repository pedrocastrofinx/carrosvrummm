'use strict';
/* ===== formulários ===== */
function campo(name, label, o = {}) {
  const { type = 'text', req, opts: op, val: vl = '', full, ph = '', rows = 3, hint = '', min, step } = o;
  let ctl;
  if (type === 'select') ctl = `<select name="${name}">${op.map(([k, n]) => `<option value="${esc(k)}" ${String(vl) === String(k) ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>`;
  else if (type === 'textarea') ctl = `<textarea name="${name}" rows="${rows}" placeholder="${esc(ph)}">${esc(vl)}</textarea>`;
  else if (type === 'checkbox') return `<label class="chk ${full ? 'full' : ''}"><input type="checkbox" name="${name}" ${vl ? 'checked' : ''}> ${label}</label>`;
  else ctl = `<input type="${type}" name="${name}" value="${esc(vl)}" placeholder="${esc(ph)}" ${min != null ? `min="${min}"` : ''} ${step ? `step="${step}"` : ''}>`;
  return `<label class="f ${full ? 'full' : ''}">${label}${req ? ' *' : ''}${ctl}${hint ? `<span class="xs" style="font-weight:400">${hint}</span>` : ''}<span class="err" data-err="${name}"></span></label>`;
}
function formModal({ titulo, corpo, okTxt = 'Salvar', tam = '', onSubmit }) {
  abrirModal(`<form id="mform" novalidate><div class="modal-h"><h2 style="flex:1">${esc(titulo)}</h2><button type="button" class="icon-btn" data-act="fecharModal" aria-label="Fechar">${ico('x', 'sm')}</button></div>
    <div class="modal-b"><div class="form-grid">${corpo}</div><div id="mprog" hidden style="margin-top:16px"><div class="prog"><i id="mprogBar"></i></div><div class="xs muted" id="mprogTxt" style="margin-top:6px"></div></div></div>
    <div class="modal-f"><button type="button" class="btn" data-act="fecharModal">Cancelar</button><button class="btn primary" type="submit">${esc(okTxt)}</button></div></form>`, { tam });
  const f = $('#mform');
  f.onsubmit = async e => {
    e.preventDefault();
    $$('[data-err]', f).forEach(x => x.textContent = '');
    const btn = $('button[type=submit]', f); btn.disabled = true;
    try {
      const erros = await onSubmit(new FormData(f), f);
      if (erros && typeof erros === 'object' && Object.keys(erros).length) {
        for (const [k, msg] of Object.entries(erros)) { const el = $(`[data-err="${k}"]`, f); if (el) el.textContent = msg; }
        const prim = $(`[name="${Object.keys(erros)[0]}"]`, f); if (prim) prim.focus();
        toast('Revise os campos destacados.', 'err');
      }
    } catch (err) { console.error(err); toast('Erro ao salvar: ' + err.message, 'err'); }
    btn.disabled = false;
  };
}
const fv = (fd, k) => (fd.get(k) ?? '').toString().trim();
const csv = s => s.split(/[,\n;]/).map(x => x.trim()).filter(Boolean);
const urlOk = s => { try { const u = new URL(s); return /^https?:$/.test(u.protocol); } catch (e) { return false; } };
function barra(p, txt) { const b = $('#mprogBar'); if (b) { $('#mprog').hidden = false; b.style.width = Math.round(p * 100) + '%'; $('#mprogTxt').textContent = txt; } }
const opLoc = (vazio = 'Nenhuma') => [['', vazio], ...S.locadoras.map(l => [l.id, l.nome])];
const opVeic = (vazio = 'Nenhum') => [['', vazio], ...veiculosAtivos().map(v => [v.id, nomeVeiculo(v)])];

/* ===== veículo ===== */
function planoRow(p = {}) {
  return `<div class="plan-row" data-plano>
    <label class="f">Prazo (meses)<input type="number" min="1" data-p="prazo" value="${p.prazo ?? ''}"></label>
    <label class="f">Km/mês<input type="number" min="0" step="100" data-p="km" value="${p.km ?? ''}"></label>
    <label class="f">Mensalidade (R$)<input type="number" min="0" step="0.01" data-p="mensalidade" value="${p.mensalidade ?? ''}"></label>
    <label class="f">Taxas<input type="text" data-p="taxas" value="${esc(p.taxas || '')}"></label>
    <label class="f">Condições<input type="text" data-p="condicoes" value="${esc(p.condicoes || '')}"></label>
    <button type="button" class="icon-btn" data-act="rmPlano" aria-label="Remover plano">${ico('trash', 'sm')}</button></div>`;
}
function abrirFormVeiculo(id) {
  const v = id ? veiculo(id) : novoVeiculo(), fotos = id ? midiasDe(id).filter(m => m.tipo === 'foto') : [];
  formModal({
    titulo: id ? 'Editar veículo' : 'Novo veículo', tam: 'mid', okTxt: id ? 'Salvar alterações' : 'Cadastrar',
    corpo: `<div class="form-sec">Identificação</div>${campo('marca', 'Marca', { req: 1, val: v.marca })}${campo('modelo', 'Modelo', { req: 1, val: v.modelo })}
      ${campo('versao', 'Versão', { val: v.versao })}${campo('ano', 'Ano/modelo', { val: v.ano, ph: '2025/2026' })}
      ${campo('categoria', 'Categoria', { type: 'select', val: v.categoria, opts: [['', 'Não informada'], ...CATEGORIAS_VEICULO] })}${campo('locadoraId', 'Locadora', { type: 'select', val: v.locadoraId, opts: opLoc('Não informada') })}
      ${id && fotos.length ? campo('fotoPrincipalId', 'Foto principal', { type: 'select', val: v.fotoPrincipalId, opts: [['', 'Automática (primeira foto)'], ...fotos.map(f => [f.id, f.titulo])] }) : ''}
      <div class="form-sec">Dados técnicos (fabricante)</div>${campo('cambio', 'Câmbio', { type: 'select', val: v.cambio, opts: [['', 'Não informado'], ...CAMBIOS.map(x => [x, x])] })}${campo('combustivel', 'Combustível', { type: 'select', val: v.combustivel, opts: [['', 'Não informado'], ...COMBUSTIVEIS.map(x => [x, x])] })}
      ${campo('motor', 'Motorização', { val: v.motor, ph: '1.0 Turbo 200' })}${campo('potencia', 'Potência', { val: v.potencia })}${campo('consumo', 'Consumo', { val: v.consumo, hint: 'Só preencha com fonte confiável' })}
      ${campo('lugares', 'Passageiros', { type: 'number', val: v.lugares ?? '', min: 1 })}${campo('portas', 'Portas', { type: 'number', val: v.portas ?? '', min: 1 })}${campo('portaMalas', 'Porta-malas', { val: v.portaMalas, ph: '300 L' })}${campo('dimensoes', 'Dimensões', { val: v.dimensoes })}
      ${campo('equipamentos', 'Principais equipamentos', { type: 'textarea', full: 1, val: v.equipamentos.join(', '), hint: 'Separe por vírgula' })}${campo('conforto', 'Itens de conforto', { type: 'textarea', val: v.conforto.join(', ') })}${campo('seguranca', 'Itens de segurança', { type: 'textarea', val: v.seguranca.join(', ') })}
      ${campo('conectividade', 'Conectividade', { type: 'textarea', val: v.conectividade.join(', ') })}${campo('comparacao', 'Notas para comparação', { type: 'textarea', val: v.comparacao })}${campo('fabricanteFonte', 'Fonte dos dados técnicos', { full: 1, val: v.fabricanteFonte, ph: 'Site do fabricante, manual...' })}
      <div class="form-sec">Assinatura (locadora)</div>
      <div class="full" id="planos">${v.planos.map(planoRow).join('')}</div><div class="full"><button type="button" class="btn sm" data-act="addPlano">${ico('plus', 'sm')} Adicionar plano</button></div>
      ${campo('disponibilidade', 'Disponibilidade', { val: v.disponibilidade, ph: 'Disponível, sob consulta...' })}${campo('fonte', 'Fonte das condições comerciais', { val: v.fonte, ph: 'Catálogo Movida em 10/2026' })}
      ${campo('entregaRapida', 'Entrega rápida (confirmada pela fonte)', { type: 'checkbox', val: v.entregaRapida === true, full: 1 })}${campo('condicoes', 'Condições específicas gerais', { type: 'textarea', full: 1, val: v.condicoes })}`,
    onSubmit(fd, f) {
      const e = {}; const marca = fv(fd, 'marca'), modelo = fv(fd, 'modelo');
      if (!marca) e.marca = 'Informe a marca.'; if (!modelo) e.modelo = 'Informe o modelo.';
      const planos = $$('[data-plano]', f).map(r => { const g = k => $(`[data-p="${k}"]`, r).value.trim(); return { prazo: num(g('prazo')), km: num(g('km')), mensalidade: num(g('mensalidade')), taxas: g('taxas'), condicoes: g('condicoes') }; }).filter(p => p.prazo != null || p.km != null || p.mensalidade != null);
      if (planos.some(p => p.mensalidade != null && p.mensalidade < 0)) e.disponibilidade = 'Mensalidade não pode ser negativa.';
      const lug = num(fv(fd, 'lugares')); if (lug != null && lug < 1) e.lugares = 'Valor inválido.';
      if (Object.keys(e).length) return e;
      const dup = S.veiculos.find(x => x.id !== v.id && !x.arquivado && norm(x.marca + x.modelo + x.versao) === norm(marca + modelo + fv(fd, 'versao')));
      if (dup) return { modelo: 'Já existe um veículo com esta marca, modelo e versão.' };
      Object.assign(v, { marca, modelo, versao: fv(fd, 'versao'), ano: fv(fd, 'ano'), categoria: fv(fd, 'categoria'), locadoraId: fv(fd, 'locadoraId'), fotoPrincipalId: fv(fd, 'fotoPrincipalId') || v.fotoPrincipalId || '',
        cambio: fv(fd, 'cambio'), combustivel: fv(fd, 'combustivel'), motor: fv(fd, 'motor'), potencia: fv(fd, 'potencia'), consumo: fv(fd, 'consumo'), lugares: lug, portas: num(fv(fd, 'portas')),
        portaMalas: fv(fd, 'portaMalas'), dimensoes: fv(fd, 'dimensoes'), equipamentos: csv(fv(fd, 'equipamentos')), conforto: csv(fv(fd, 'conforto')), seguranca: csv(fv(fd, 'seguranca')), conectividade: csv(fv(fd, 'conectividade')),
        comparacao: fv(fd, 'comparacao'), fabricanteFonte: fv(fd, 'fabricanteFonte'), planos, disponibilidade: fv(fd, 'disponibilidade'), fonte: fv(fd, 'fonte'), entregaRapida: fd.get('entregaRapida') ? true : null, condicoes: fv(fd, 'condicoes'), atualizadoEm: agora() });
      if (!id) S.veiculos.push(v);
      salvar(); fecharModal(); toast(id ? 'Veículo atualizado.' : 'Veículo cadastrado.'); rotear();
    }
  });
}

/* ===== locadora ===== */
function abrirFormLocadora(id) {
  const l = id ? locadora(id) : { id: uid('loc') };
  formModal({
    titulo: id ? 'Editar locadora' : 'Nova locadora', okTxt: id ? 'Salvar' : 'Cadastrar',
    corpo: `${campo('nome', 'Nome', { req: 1, val: l.nome, full: 1 })}${campo('descricao', 'Descrição', { type: 'textarea', full: 1, val: l.descricao })}${campo('site', 'Site oficial', { type: 'url', val: l.site, ph: 'https://' })}${campo('catalogoUrl', 'Link do catálogo de assinatura', { type: 'url', val: l.catalogoUrl, ph: 'https://' })}
      ${campo('logoUrl', 'Logotipo (URL, só se autorizado)', { type: 'url', val: l.logoUrl, full: 1 })}${campo('contato', 'Contato comercial', { val: l.contato, full: 1 })}${campo('obs', 'Observações internas', { type: 'textarea', val: l.obs, full: 1 })}`,
    onSubmit(fd) {
      const e = {}, nome = fv(fd, 'nome'); if (!nome) e.nome = 'Informe o nome.';
      else if (S.locadoras.some(x => x.id !== l.id && norm(x.nome) === norm(nome))) e.nome = 'Já existe uma locadora com este nome.';
      for (const k of ['site', 'catalogoUrl', 'logoUrl']) if (fv(fd, k) && !urlOk(fv(fd, k))) e[k] = 'URL inválida (use http:// ou https://).';
      if (Object.keys(e).length) return e;
      Object.assign(l, { nome, descricao: fv(fd, 'descricao'), site: fv(fd, 'site'), catalogoUrl: fv(fd, 'catalogoUrl'), logoUrl: fv(fd, 'logoUrl'), contato: fv(fd, 'contato'), obs: fv(fd, 'obs'), atualizadoEm: agora() });
      if (!id) S.locadoras.push(l);
      salvar(); fecharModal(); toast('Locadora salva.'); rotear();
    }
  });
}

/* ===== mídia ===== */
const EXT_3D = ['glb'], EXT_IMG = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'], EXT_VID = ['mp4', 'webm', 'mov', 'm4v', 'ogv', 'mkv'];
const MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif', mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', m4v: 'video/mp4', ogv: 'video/ogg', mkv: 'video/x-matroska', glb: 'model/gltf-binary' };
const extDe = n => (n.split('.').pop() || '').toLowerCase();
const tipoDe = n => EXT_IMG.includes(extDe(n)) ? 'foto' : EXT_VID.includes(extDe(n)) ? 'video' : EXT_3D.includes(extDe(n)) ? 'modelo3d' : null;
function tituloDe(path) {
  const base = path.split('/').pop().replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
  return base.split(' ').map(w => w === w.toLowerCase() ? cap(w) : w).join(' ') || path;
}
async function guardarArquivo(blob, nome, nuvem = false) {
  const type = blob.type || MIME[extDe(nome)] || 'application/octet-stream', fileId = uid('f');
  if (nuvem && window.Nuvem && window.Nuvem.ativo()) return window.Nuvem.enviar(blob.slice(0, blob.size, type), nome, type);   // hospedado + admin: vai para o Supabase Storage (todos veem e baixam)
  await DB.put(fileId, { blob: blob.slice(0, blob.size, type), name: nome, type, size: blob.size });
  return fileId;
}
async function criarMidiaArquivo(blob, nome, meta) {
  const tipo = tipoDe(nome); if (!tipo) throw new Error('Tipo de arquivo não suportado: ' + nome);
  const nuvem = !!(window.Nuvem && window.Nuvem.ativo() && isAdmin());
  const fileId = await guardarArquivo(blob, nome, nuvem); let thumbId = '';
  if (tipo === 'video') { const tb = await gerarThumb(blob); if (tb) thumbId = await guardarArquivo(tb, 'thumb.jpg', nuvem); }
  const m = Object.assign({ id: uid('m'), tipo, titulo: tituloDe(nome), descricao: '', categoria: tipo === 'foto' ? 'foto_geral' : 'outros', veiculoId: '', locadoraId: '', origem: 'arquivo', fileId, thumbId, url: '', nomeOriginal: nome, tamanho: blob.size, tags: [], criadoEm: agora(), autorizacao: '', permiteDownload: true, arquivado: false }, meta);
  if (nuvem) Object.assign(m, { nuvem: true, nuvemId: crypto.randomUUID(), nuvemPendente: true });
  S.midias.push(m); return m;
}
function abrirFormMidia(id, pre = {}) {
  /* pre.arquivos: FileList vinda de arrastar-e-soltar */
  const ed = id ? midia(id) : null, m = ed || { categoria: pre.cliente ? 'retirada' : 'outros', veiculoId: pre.vid || '', locadoraId: '', tags: pre.cliente ? ['0 km', 'retirada'] : [], permiteDownload: true, autorizacao: pre.cliente ? 'pendente' : '', cliente: pre.cliente ? { nome: '', data: '' } : null };
  const cli = !!(m.cliente || pre.cliente);
  formModal({
    titulo: ed ? 'Editar mídia' : cli ? 'Novo vídeo de cliente' : 'Adicionar mídia', tam: 'mid', okTxt: ed ? 'Salvar' : 'Enviar',
    corpo: `${ed ? '' : `<div class="full"><div class="row" style="margin-bottom:8px"><label class="chk"><input type="radio" name="origem" value="arquivo" checked> Enviar arquivo</label><label class="chk"><input type="radio" name="origem" value="giro"> Giro 360° (várias fotos em sequência)</label><label class="chk"><input type="radio" name="origem" value="link"> Usar link (YouTube, Drive, URL)</label></div>
      <div id="origArq"><input type="file" name="arquivos" multiple accept="image/*,video/*,.glb"><span class="err" data-err="arquivos" style="color:var(--bad);font-size:12px"></span><div class="xs muted" style="margin-top:4px" id="dicaArq">Vários arquivos: o título sai do nome de cada um. Vídeos ganham miniatura automática. Modelo 3D: envie um arquivo .glb.</div></div>
      <div id="origLink" hidden><input type="url" name="url" placeholder="https://..." ><span class="err" data-err="url" style="color:var(--bad);font-size:12px"></span><label class="chk" style="margin-top:8px"><input type="radio" name="tipoLink" value="video" checked> Vídeo</label> <label class="chk"><input type="radio" name="tipoLink" value="foto"> Foto</label></div></div>`}
      ${ed && ed.origem === 'link' ? campo('url', 'Link', { type: 'url', val: ed.url, full: 1 }) : ''}
      ${campo('titulo', 'Título', { val: ed?.titulo || '', hint: ed ? '' : 'Em envio múltiplo, deixe vazio para usar o nome dos arquivos', full: 1 })}${campo('descricao', 'Descrição curta', { type: 'textarea', rows: 2, val: ed?.descricao || '', full: 1 })}
      ${campo('categoria', 'Categoria', { type: 'select', val: m.categoria, opts: categoriasMidia() })}${campo('veiculoId', 'Veículo relacionado', { type: 'select', val: m.veiculoId, opts: opVeic('Nenhum (material geral)') })}${campo('todasVersoes', 'Vale para todas as versões deste modelo', { type: 'checkbox', val: !!m.modeloChave, full: 1 })}
      ${campo('locadoraId', 'Locadora (origem)', { type: 'select', val: m.locadoraId, opts: opLoc('Nenhuma') })}${campo('tags', 'Tags', { val: (m.tags || []).join(', '), hint: 'Separe por vírgula' })}
      ${cli ? `<div class="form-sec">Cliente e autorização</div>${campo('clienteNome', 'Nome ou identificação autorizada', { val: m.cliente?.nome || '' })}${campo('clienteData', 'Data da retirada', { type: 'date', val: m.cliente?.data || '' })}${campo('autorizacao', 'Autorização de uso comercial', { type: 'select', val: m.autorizacao, opts: [['pendente', 'Pendente (restrito)'], ['autorizado', 'Autorizado'], ['nao_autorizado', 'Não autorizado (restrito)']] })}` : ''}
      ${campo('permiteDownload', 'Permitir download do arquivo original', { type: 'checkbox', val: m.permiteDownload !== false, full: 1 })}`,
    async onSubmit(fd) {
      const e = {}, orig = ed ? ed.origem : fv(fd, 'origem');
      const files = [...(fd.getAll('arquivos') || [])].filter(f => f && f.size);
      if (!ed && orig === 'giro') {
        if (files.length < 8) e.arquivos = 'Para um giro de verdade, escolha ao menos 8 fotos (ideal 24 a 36).';
        else if (files.some(f => tipoDe(f.name) !== 'foto')) e.arquivos = 'No giro 360° só entram imagens.';
      }
      if (!ed && orig === 'arquivo') {
        if (!files.length) e.arquivos = 'Escolha ao menos um arquivo.';
        else { const ruim = files.find(f => !tipoDe(f.name)); if (ruim) e.arquivos = `Formato não suportado: ${ruim.name}. Use ${EXT_IMG.concat(EXT_VID).join(', ')}.`; }
      }
      const url = ed ? fv(fd, 'url') : fv(fd, 'url');
      if ((!ed && orig === 'link') || (ed && ed.origem === 'link')) { if (!url) e.url = 'Informe o link.'; else if (!urlOk(url)) e.url = 'URL inválida.'; }
      const unico = ed || orig === 'link' || files.length === 1;
      if (unico && !fv(fd, 'titulo') && !(files[0])) e.titulo = 'Informe o título.';
      if (cli && fv(fd, 'autorizacao') === 'autorizado' && !fv(fd, 'clienteNome')) e.clienteNome = 'Para marcar como autorizado, identifique o cliente.';
      if (Object.keys(e).length) return e;
      const meta = { titulo: fv(fd, 'titulo'), descricao: fv(fd, 'descricao'), categoria: fv(fd, 'categoria'), veiculoId: fv(fd, 'veiculoId'), locadoraId: fv(fd, 'locadoraId'), tags: csv(fv(fd, 'tags')), permiteDownload: !!fd.get('permiteDownload'), modeloChave: (fd.get('todasVersoes') && veiculo(fv(fd, 'veiculoId'))) ? modeloChaveDe(veiculo(fv(fd, 'veiculoId'))) : '' };
      if (cli) { meta.cliente = { nome: fv(fd, 'clienteNome'), data: fv(fd, 'clienteData') }; meta.autorizacao = fv(fd, 'autorizacao'); }
      if (ed) { Object.assign(ed, meta); if (ed.origem === 'link') ed.url = url; if (!meta.titulo) ed.titulo = ed.nomeOriginal || 'Sem título'; }
      else if (orig === 'giro') {
        const ord = files.slice().sort((x, y) => x.name.localeCompare(y.name, 'pt-BR', { numeric: true })), total = ord.reduce((s, f) => s + f.size, 0); let feito = 0; const frames = [];
        for (const [i, f] of ord.entries()) { barra(feito / total, `Guardando quadro ${i + 1} de ${ord.length}`); frames.push({ fileId: await guardarArquivo(f, f.name) }); feito += f.size; }
        const vv = veiculo(meta.veiculoId);
        S.midias.push({ id: uid('m'), tipo: 'giro', origem: 'arquivo', frames, fileId: frames[0].fileId, thumbId: '', url: '', nomeOriginal: ord[0].name + ' … ' + ord[ord.length - 1].name, tamanho: total, criadoEm: agora(), arquivado: false, ...meta, titulo: meta.titulo || ((vv ? nomeVeiculo(vv) + ' — ' : '') + 'Giro 360°'), permiteDownload: false });
      }
      else if (orig === 'link') S.midias.push({ id: uid('m'), tipo: fv(fd, 'tipoLink') || 'video', origem: 'link', url, fileId: '', thumbId: '', nomeOriginal: url, criadoEm: agora(), arquivado: false, ...meta, titulo: meta.titulo });
      else {
        const total = files.reduce((s, f) => s + f.size, 0); let feito = 0;
        for (const [i, f] of files.entries()) {
          barra(feito / total, `Enviando ${i + 1} de ${files.length}: ${f.name}`);
          const mm = { ...meta }; if (files.length > 1 || !mm.titulo) delete mm.titulo;
          await criarMidiaArquivo(f, f.name, mm); feito += f.size;
          barra(feito / total, `${i + 1} de ${files.length} concluído`);
        }
      }
      salvar(); fecharModal(); toast(ed ? 'Mídia atualizada.' : 'Mídia cadastrada.'); rotear();
    }
  });
  if (pre.arquivos?.length) { const inp = $('#mform [name=arquivos]'); if (inp) inp.files = pre.arquivos; }
  const f = $('#mform'); if (f && !ed) f.addEventListener('change', e => { if (e.target.name === 'origem') { const v = e.target.value; $('#origArq').hidden = v === 'link'; $('#origLink').hidden = v !== 'link'; $('#dicaArq').textContent = v === 'giro' ? 'Escolha as fotos de UMA volta completa do carro (mín. 8, ideal 24 a 36), nomeadas em ordem (01, 02, 03…). Elas são ordenadas pelo nome do arquivo.' : 'Vários arquivos: o título sai do nome de cada um. Vídeos ganham miniatura automática. Modelo 3D: envie um arquivo .glb.'; } });
}

/* ===== templates ===== */
function abrirFormTemplate(id, copia) {
  const t = id && !copia ? S.templates.find(x => x.id === id) : null, base = id ? S.templates.find(x => x.id === id) : { tipo: 'video', nome: '', corpo: '' };
  formModal({
    titulo: t ? 'Editar template' : 'Novo template', tam: 'mid',
    corpo: `${campo('nome', 'Nome', { req: 1, val: copia ? base.nome + ' (cópia)' : base.nome })}${campo('tipo', 'Usado para', { type: 'select', val: base.tipo, opts: [['veiculo', 'Apresentação de veículo'], ['video', 'Vídeo do veículo'], ['interior', 'Vídeo do interior'], ['retirada', 'Vídeo de retirada']] })}
      ${campo('corpo', 'Texto da mensagem', { type: 'textarea', rows: 10, req: 1, val: base.corpo, full: 1 })}
      <div class="full"><div class="xs muted" style="margin-bottom:6px">Clique para inserir um campo:</div><div class="vars">${Object.keys(ROTULO_CAMPO).map(k => `<code data-act="inserirCampo" data-k="${k}">{{${k}}}</code>`).join('')}</div>
      <div class="xs muted" style="margin-top:8px">Linha com campo sem dado é omitida na mensagem final.</div></div>`,
    onSubmit(fd) {
      const e = {}; if (!fv(fd, 'nome')) e.nome = 'Informe o nome.'; if (!fv(fd, 'corpo')) e.corpo = 'Escreva o texto.';
      const desc = [...fv(fd, 'corpo').matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map(x => x[1]).find(k => !(k in ROTULO_CAMPO));
      if (desc) e.corpo = `Campo desconhecido: {{${desc}}}.`;
      if (Object.keys(e).length) return e;
      const dados = { nome: fv(fd, 'nome'), tipo: fv(fd, 'tipo'), corpo: fv(fd, 'corpo') };
      if (t) Object.assign(t, dados); else S.templates.push({ id: uid('tpl'), arquivado: false, ...dados });
      salvar(); fecharModal(); toast('Template salvo.'); rotear();
    }
  });
}

/* ===== importação (ZIP / pastas / arquivos) ===== */
let jszipP;
function carregarJSZip() {
  if (window.JSZip) return Promise.resolve();
  return jszipP || (jszipP = new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'; s.onload = res; s.onerror = () => rej(new Error('Não foi possível carregar o leitor de ZIP (sem internet?). Extraia o ZIP e importe a pasta.')); document.head.appendChild(s); }));
}
async function expandir(files, log) {
  const itens = [];
  for (const f of files) {
    if (extDe(f.name) === 'zip') {
      await carregarJSZip(); const z = await JSZip.loadAsync(f);
      for (const [path, ent] of Object.entries(z.files)) {
        if (ent.dir || /(^|\/)(__MACOSX|\.DS_Store|Thumbs\.db)/i.test(path) || path.split('/').pop().startsWith('._')) continue;
        if (!tipoDe(path)) { if (extDe(path) === 'zip') log.push(`ZIP dentro de ZIP ignorado: ${path}`); continue; }
        itens.push({ path: f.name.replace(/\.zip$/i, '') + '/' + path, ler: () => ent.async('blob'), size: ent._data?.uncompressedSize || 0 });
      }
    } else if (tipoDe(f.name)) itens.push({ path: f.webkitRelativePath || f.name, ler: async () => f, size: f.size });
  }
  return itens;
}
function classificar(path, tipo, padrao) {
  const n = norm(path), r = { categoria: tipo === 'foto' ? 'foto_geral' : padrao, veiculoId: '', locadoraId: '', ambiguo: false, restrito: false };
  const cit = Clove.citados(path), modelos = [...new Set(cit.map(v => norm(v.marca + v.modelo)))];
  if (modelos.length === 1) { if (cit.length === 1) r.veiculoId = cit[0].id; else r.ambiguo = true; } else if (modelos.length > 1) r.ambiguo = true;
  const loc = S.locadoras.find(l => !l.demo && n.includes(norm(l.nome))); if (loc) r.locadoraId = loc.id;
  if (tipo === 'video' && /banco|extrato|cartao|cartoes|comprovante|renda|documento/.test(n)) r.categoria = 'tutorial_bancos';
  else if (/painel|multimidia/.test(n)) r.categoria = 'painel'; else if (/interior|interno/.test(n)) r.categoria = 'interior';
  else if (/porta.?mala/.test(n)) r.categoria = 'portamalas'; else if (/exterior|externo/.test(n)) r.categoria = 'exterior';
  else if (/retirada|entrega/.test(n)) { r.categoria = 'retirada'; r.restrito = true; } else if (/depoimento/.test(n)) { r.categoria = 'depoimento'; r.restrito = true; }
  return r;
}
async function importar(files, padrao, ui) {
  const log = [], res = { video: 0, foto: 0, dup: 0, erro: [], semVeic: [], ambig: [], restritos: 0 };
  ui.txt('Lendo arquivos...', 0);
  let itens; try { itens = await expandir(files, log); } catch (e) { ui.txt(e.message, 0); throw e; }
  if (!itens.length) { ui.fim('<div class="warnbox">Nenhuma imagem ou vídeo encontrado nos arquivos escolhidos.</div>'); return; }
  const existentes = new Set(S.midias.map(m => m.nomeOriginal + '|' + m.tamanho));
  for (const [i, it] of itens.entries()) {
    ui.txt(`Importando ${i + 1} de ${itens.length}: ${it.path.split('/').pop()}`, i / itens.length);
    try {
      const blob = await it.ler(); const nome = it.path; const tipo = tipoDe(nome);
      if (existentes.has(nome + '|' + blob.size)) { res.dup++; continue; }
      /* foto já cadastrada por link (catálogo da locadora): o arquivo salvo tem o mesmo código no nome → troca o link pelo arquivo local */
      const uuid = (nome.split('/').pop().match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/) || [])[0];
      const alvo = uuid && tipo === 'foto' && S.midias.find(m => m.origem === 'link' && m.tipo === 'foto' && m.url.includes(uuid));
      if (alvo) { alvo.fileId = await guardarArquivo(blob, nome); alvo.origem = 'arquivo'; alvo.nomeOriginal = nome; alvo.tamanho = blob.size; res.foto++; res.vinculadas = (res.vinculadas || 0) + 1; if (i % 5 === 0) salvar(); continue; }
      /* foto de catálogo identificada só pelo nome do arquivo (Movida): liga a todos os carros que usam essa imagem */
      const base = nome.split('/').pop().toLowerCase(), donos = tipo === 'foto' ? S.veiculos.filter(v => (v.fotoChave || []).includes(base)) : [];
      if (donos.length) {
        const fid = await guardarArquivo(blob, nome);
        for (const v of donos) if (!S.midias.some(m => m.veiculoId === v.id && m.nomeOriginal === nome)) S.midias.push({ id: uid('m'), tipo: 'foto', titulo: nomeVeiculo(v), descricao: '', categoria: 'foto_geral', veiculoId: v.id, locadoraId: v.locadoraId || '', origem: 'arquivo', fileId: fid, thumbId: '', url: '', nomeOriginal: nome, tamanho: blob.size, tags: [], criadoEm: agora(), autorizacao: '', permiteDownload: true, arquivado: false });
        res.foto++; res.vinculadas = (res.vinculadas || 0) + 1; continue;
      }
      const c = classificar(nome, tipo, padrao);
      const meta = { categoria: c.categoria, veiculoId: c.veiculoId, locadoraId: c.locadoraId };
      if (c.restrito) { meta.cliente = { nome: '', data: '' }; meta.autorizacao = 'pendente'; res.restritos++; }
      const m = await criarMidiaArquivo(blob, nome, meta);
      existentes.add(nome + '|' + blob.size); res[tipo]++;
      if (!m.veiculoId && CATS_COMERCIAIS.includes(m.categoria)) (c.ambiguo ? res.ambig : res.semVeic).push(m.titulo);
      if (i % 5 === 0) salvar();
    } catch (e) { res.erro.push(it.path + ': ' + e.message); }
  }
  salvar();
  ui.fim(`<div class="infobox"><b>Concluído.</b> ${res.video} vídeo(s) e ${res.foto} foto(s) importados${res.vinculadas ? ` (${res.vinculadas} delas ligadas automaticamente aos carros do catálogo)` : ''}${res.dup ? `, ${res.dup} já existiam e foram ignorados` : ''}.</div>
    ${res.restritos ? `<div class="warnbox" style="margin-top:8px">${res.restritos} arquivo(s) pareciam retirada/depoimento de cliente. Ficaram como <b>restritos (autorização pendente)</b> até você liberar em Clientes e retiradas.</div>` : ''}
    ${res.semVeic.length || res.ambig.length ? `<div class="warnbox" style="margin-top:8px"><b>${res.semVeic.length + res.ambig.length} imagem(ns)/vídeo(s) de veículo sem associação.</b> ${res.ambig.length ? `${res.ambig.length} citam mais de um modelo ou um modelo com várias versões — não associei sem confirmação. ` : ''}Veja em <a href="#/biblioteca?vid=_sem&escopo=comercial">Biblioteca → Sem veículo</a> e vincule editando a mídia.</div>` : ''}
    ${res.erro.length ? `<div class="warnbox" style="margin-top:8px;border-color:#f3c4c4;background:#fff1f1;color:#8f2020"><b>${res.erro.length} erro(s):</b><br>${res.erro.slice(0, 8).map(esc).join('<br>')}</div>` : ''}
    ${log.length ? `<div class="xs muted" style="margin-top:8px">${log.map(esc).join('<br>')}</div>` : ''}`);
}

/* ===== importar catálogo em lote (JSON) ===== */
const CATS_OK = CATEGORIAS_VEICULO.map(c => c[0]);
function importarCatalogo(d) {
  const lista = Array.isArray(d) ? d : d.veiculos;
  if (!Array.isArray(lista)) throw new Error('JSON inválido: esperado { "veiculos": [ ... ] }.');
  const r = { novos: 0, atualizados: 0, fotos: 0, videos: 0, ignorados: [] };
  for (const o of lista) {
    if (!o.marca || !o.modelo) { r.ignorados.push(JSON.stringify(o).slice(0, 60)); continue; }
    let loc = o.locadora && S.locadoras.find(l => norm(l.nome) === norm(o.locadora));
    if (o.locadora && !loc) { loc = { id: uid('loc'), nome: o.locadora, logoUrl: '', descricao: '', site: '', catalogoUrl: '', contato: '', obs: '', atualizadoEm: agora() }; S.locadoras.push(loc); }
    const chave = norm([o.marca, o.modelo, o.versao || ''].join('|'));
    let v = S.veiculos.find(x => !x.demo && norm([x.marca, x.modelo, x.versao || ''].join('|')) === chave && (!loc || !x.locadoraId || x.locadoraId === loc.id))
      || S.veiculos.find(x => !x.demo && !x.versao && !x.locadoraId && String(x.fonte).startsWith('Cadastro base') && norm(x.marca + x.modelo) === norm(o.marca + o.modelo));
    const dados = { marca: o.marca, modelo: o.modelo, versao: o.versao || '', ano: o.ano || '', categoria: CATS_OK.includes(o.categoria) ? o.categoria : '', locadoraId: loc?.id || '', cambio: o.cambio || '', combustivel: o.combustivel || '', lugares: num(o.lugares), portas: num(o.portas), motor: o.motor || '', potencia: o.potencia || '', portaMalas: o.portaMalas || '', consumo: o.consumo || '', dimensoes: o.dimensoes || '', fabricanteFonte: o.fabricanteFonte || '', equipamentos: o.equipamentos || [], disponibilidade: o.disponibilidade || '', fonte: o.fonte || '', fichaUrl: o.fichaUrl || '', fotoChave: o.fotoChave || [], segmento: o.segmentoOrigem || '', conectividade: o.conectividade || [], conforto: o.conforto || [], condicoes: o.condicoes || '', entregaRapida: o.entregaRapida === true ? true : null, atualizadoEm: agora() };
    const planos = (o.planos || []).filter(p => p.mensalidade != null || p.prazo != null || p.km != null).map(p => ({ prazo: num(p.prazo), km: num(p.km), mensalidade: num(p.mensalidade), taxas: p.taxas || '', condicoes: p.condicoes || '' }));
    if (v) { for (const [k, x] of Object.entries(dados)) if (val(x) != null || k === 'atualizadoEm') v[k] = x; if (planos.length) v.planos = planos; r.atualizados++; }
    else { v = novoVeiculo({ ...dados, planos }); S.veiculos.push(v); r.novos++; }
    const tem = u => S.midias.some(m => m.url === u && m.veiculoId === v.id);
    for (const u of o.fotos || []) if (urlOk(u) && !tem(u)) { S.midias.push({ id: uid('m'), tipo: 'foto', titulo: nomeVeiculo(v), descricao: '', categoria: 'foto_geral', veiculoId: v.id, locadoraId: loc?.id || '', origem: 'link', url: u, fileId: '', thumbId: '', nomeOriginal: u, tamanho: 0, tags: [], criadoEm: agora(), autorizacao: '', permiteDownload: true, arquivado: false }); r.fotos++; }
    for (const vd of o.videos || []) { const u = typeof vd === 'string' ? vd : vd.url; if (urlOk(u) && !tem(u)) { S.midias.push({ id: uid('m'), tipo: 'video', titulo: vd.titulo || ('Vídeo ' + marcaModelo(v)), descricao: vd.descricao || '', categoria: vd.categoria || 'exterior', veiculoId: v.id, locadoraId: loc?.id || '', origem: 'link', url: u, fileId: '', thumbId: '', nomeOriginal: vd.nomeOriginal || u, tamanho: 0, modeloChave: vd.todasVersoes ? modeloChaveDe(v) : '', tags: Array.isArray(vd.tags) ? vd.tags.map(String) : [], criadoEm: agora(), autorizacao: '', permiteDownload: vd.permiteDownload === true, arquivado: Array.isArray(vd.tags) && vd.tags.includes('sugerido-auto') && !S.config.mostrarSugeridos }); r.videos++; } }
  }
  salvar(); return r;
}

/* ===== backup ===== */
function baixarTexto(nome, txt) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'application/json' })); a.download = nome; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }

/* ===== tela de administração ===== */
let AM = { q: '' };
const ABAS_ADMIN = [['veiculos', 'Veículos'], ['locadoras', 'Locadoras'], ['midias', 'Mídias'], ['clientes', 'Clientes'], ['templates', 'Templates'], ['categorias', 'Categorias e tags'], ['clove', 'Clove'], ['importar', 'Importar'], ['dados', 'Dados e backup']];
function viewAdmin(tab = 'veiculos') {
  if (!isAdmin()) return vazio('lock', 'Área restrita a administradores', 'Troque o perfil no menu do usuário (canto superior direito). Atenção: nesta versão local o perfil é só uma separação de tela; autenticação real entra na hospedagem.', '<button class="btn primary" data-act="virarAdmin">Entrar como administrador</button>');
  const corpo = { veiculos: adVeiculos, locadoras: adLocadoras, midias: adMidias, clientes: adClientes, templates: () => `<div class="sec-head"><div><h2>Templates de mensagem</h2></div><span class="sp"></span><button class="btn primary" data-act="novoTemplate">${ico('plus', 'sm')} Novo template</button></div>${tabelaTemplates()}`, categorias: adCategorias, clove: adClove, importar: adImportar, dados: adDados }[tab] || adVeiculos;
  return `<div class="page-head"><div><h1>Administração</h1><p>Cadastre e mantenha veículos, mídias e mensagens sem mexer no código.</p></div></div>
  <div class="tabs">${ABAS_ADMIN.map(([k, n]) => `<button class="${tab === k ? 'on' : ''}" data-act="goAdmin" data-tab="${k}">${n}</button>`).join('')}</div><div id="adBody">${corpo()}</div>`;
}
function adVeiculos() {
  return `<div class="sec-head"><div><h2>Veículos (${S.veiculos.length})</h2></div><span class="sp"></span><button class="btn primary" data-act="novoVeiculo">${ico('plus', 'sm')} Novo veículo</button></div>
  <div class="card tbl-wrap"><table class="table"><thead><tr><th></th><th>Veículo</th><th>Locadora</th><th>Planos</th><th>Mídias</th><th>Ficha</th><th>Atualizado</th><th></th></tr></thead><tbody>${S.veiculos.map(v => { const f = camposFaltando(v).length; return `<tr style="${v.arquivado ? 'opacity:.5' : ''}"><td><div class="thumb-s">${imgDe(fotoPrincipal(v))}</div></td><td><a href="#/veiculo/${v.id}"><b>${esc(nomeVeiculo(v))}</b></a> ${v.demo ? '<span class="tag demo">DEMO</span>' : ''}${v.arquivado ? ' <span class="tag">Arquivado</span>' : ''}</td><td>${esc(locadora(v.locadoraId)?.nome || NI)}</td><td>${v.planos.length}</td><td>${S.midias.filter(m => m.veiculoId === v.id && !m.arquivado).length}</td><td>${f ? `<span class="tag warn">${f} pendência${f > 1 ? 's' : ''}</span>` : '<span class="tag ok">Completa</span>'}</td><td>${dataBR(v.atualizadoEm)}</td><td style="white-space:nowrap;text-align:right"><button class="btn sm" data-act="editarVeiculo" data-id="${v.id}">Editar</button> <button class="btn sm danger" data-act="arquivarVeiculo" data-id="${v.id}">${v.arquivado ? 'Restaurar' : 'Arquivar'}</button></td></tr>`; }).join('')}</tbody></table></div>`;
}
function adLocadoras() {
  return `<div class="sec-head"><h2>Locadoras</h2><span class="sp"></span><button class="btn primary" data-act="novaLocadora">${ico('plus', 'sm')} Nova locadora</button></div><div class="card tbl-wrap"><table class="table"><thead><tr><th>Nome</th><th>Veículos</th><th>Site</th><th>Atualizado</th><th></th></tr></thead><tbody>${S.locadoras.map(l => `<tr><td><b>${esc(l.nome)}</b> ${l.demo ? '<span class="tag demo">DEMO</span>' : ''}</td><td>${S.veiculos.filter(v => v.locadoraId === l.id).length}</td><td>${l.site ? `<a target="_blank" rel="noopener" href="${esc(l.site)}">${esc(l.site.replace(/^https?:\/\//, ''))}</a>` : NI}</td><td>${dataBR(l.atualizadoEm)}</td><td style="text-align:right;white-space:nowrap"><button class="btn sm" data-act="editarLocadora" data-id="${l.id}">Editar</button> <button class="btn sm danger" data-act="excluirLocadora" data-id="${l.id}">Excluir</button></td></tr>`).join('')}</tbody></table></div>`;
}
function linhasMidia(lista) {
  return lista.slice(0, 200).map(m => `<tr><td><div class="thumb-s">${thumbMidia(m)}</div></td><td><b>${esc(m.titulo)}</b><div class="xs muted">${esc(m.nomeOriginal || '')}</div></td><td>${esc(nomeCat(m.categoria))}</td><td>${esc(nomeVeiculo(veiculo(m.veiculoId)) || '—')}</td><td>${m.cliente ? `<span class="tag ${(AUTORIZACAO[m.autorizacao] || ['', ''])[1]}">${(AUTORIZACAO[m.autorizacao] || ['Sem status'])[0]}</span>` : '—'}</td><td>${dataBR(m.criadoEm)}</td><td style="text-align:right;white-space:nowrap"><button class="btn sm" data-act="abrirMidia" data-id="${m.id}">Ver</button> <button class="btn sm" data-act="editarMidia" data-id="${m.id}">Editar</button> <button class="btn sm danger" data-act="excluirMidia" data-id="${m.id}">Excluir</button></td></tr>`).join('');
}
function adMidias() {
  const q = norm(AM.q), l = S.midias.filter(m => !q || norm([m.titulo, m.nomeOriginal, nomeCat(m.categoria), nomeVeiculo(veiculo(m.veiculoId))].join(' ')).includes(q)).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  return `<div class="sec-head"><h2>Mídias (${S.midias.length})</h2><span class="sp"></span><input type="search" data-am="q" placeholder="Filtrar..." value="${esc(AM.q)}" style="width:220px"><button class="btn" data-act="autoVincular" title="Liga cada vídeo ao carro citado no nome do arquivo">${ico('link', 'sm')} Vincular pelo nome</button><button class="btn primary" data-act="novaMidia">${ico('upload', 'sm')} Adicionar</button></div>
  ${S.midias.length ? `<div class="card tbl-wrap"><table class="table"><thead><tr><th></th><th>Título</th><th>Categoria</th><th>Veículo</th><th>Autorização</th><th>Cadastro</th><th></th></tr></thead><tbody id="amBody">${linhasMidia(l)}</tbody></table></div>${l.length > 200 ? '<p class="muted small">Mostrando 200. Use o filtro.</p>' : ''}` : vazio('video', 'Nenhuma mídia', 'Envie arquivos ou use a aba Importar para os ZIPs.', '<button class="btn primary" data-act="novaMidia">Adicionar mídia</button>')}`;
}
function adClientes() {
  const l = S.midias.filter(m => m.cliente);
  return `<div class="sec-head"><h2>Vídeos de clientes (${l.length})</h2><span class="sp"></span><button class="btn primary" data-act="novoCliente">${ico('plus', 'sm')} Novo</button></div>${l.length ? `<div class="card tbl-wrap"><table class="table"><thead><tr><th></th><th>Título</th><th>Categoria</th><th>Veículo</th><th>Autorização</th><th>Cadastro</th><th></th></tr></thead><tbody>${linhasMidia(l)}</tbody></table></div>` : vazio('users', 'Nenhum vídeo de cliente', 'Cadastre com o nome autorizado e o status da autorização.')}`;
}
function adCategorias() {
  const uso = k => S.midias.filter(m => m.categoria === k).length;
  const tags = {}; S.midias.forEach(m => (m.tags || []).forEach(t => tags[t] = (tags[t] || 0) + 1));
  return `<div class="grid g-2"><div class="card pad"><h2>Categorias de mídia</h2><div style="margin:10px 0">${categoriasMidia().map(([k, n]) => `<div class="spec-row"><span>${esc(n)}</span><span>${uso(k)} ${S.catsExtras.some(c => c.key === k) ? `<button class="btn sm danger" data-act="rmCategoria" data-k="${k}">Remover</button>` : ''}</span></div>`).join('')}</div>
    <form data-form="categoria" class="row"><input type="text" name="nome" placeholder="Nova categoria" aria-label="Nova categoria" style="flex:1"><button class="btn primary" type="submit">Criar</button></form></div>
    <div class="card pad"><h2>Tags em uso</h2><p class="small muted">Tags nascem ao serem digitadas no cadastro de mídia.</p><div class="lista-eq">${Object.entries(tags).sort((a, b) => b[1] - a[1]).map(([t, n]) => `<span class="tag">${esc(t)} · ${n}</span>`).join('') || '<span class="muted small">Nenhuma tag ainda.</span>'}</div></div></div>`;
}
function adClove() {
  return `<div class="grid g-2"><div class="card pad" style="display:grid;gap:12px"><h2>Conexão do Clove</h2>
    <div class="infobox">Sem endereço de API, o Clove roda em <b>modo demonstração</b> (regras sobre os dados locais, sem IA externa). Ao informar um endereço, a pergunta e os registros recuperados são enviados para o <b>seu servidor</b>, que chama o modelo. <b>Nunca coloque chave de API aqui.</b></div>
    <form data-form="cloveCfg" style="display:grid;gap:12px"><label class="f">Endereço da API do Clove<input type="url" name="endpoint" value="${esc(S.config.cloveEndpoint)}" placeholder="https://seu-servidor.com/api/clove"></label>
    <label class="f">URL pública do Hub (para links copiados)<input type="url" name="baseUrl" value="${esc(S.config.baseUrl)}" placeholder="https://hub.seudominio.com.br/"></label>
    <div class="row"><button class="btn primary" type="submit">Salvar</button><button class="btn" type="button" data-act="testarClove">Testar conexão</button></div></form></div>
    <div class="card pad"><h2>Contrato da API</h2><p class="small muted">POST JSON → resposta JSON <code>{"texto": "..."}</code></p>
    <pre style="background:var(--soft);padding:12px;border-radius:10px;font-size:12px;overflow:auto">{ "pergunta": "...",\n  "regras": "…só responda com o contexto…",\n  "historico": [{"papel","texto"}],\n  "contexto": { "veiculos": [...], "midias": [...] } }</pre>
    <p class="small muted">O servidor lê a chave de uma variável de ambiente (ex.: <code>ANTHROPIC_API_KEY</code>). Veja o README para um exemplo pronto.</p></div></div>`;
}
function adImportar() {
  return `<div class="card pad" style="display:grid;gap:14px"><div><h2>Importar materiais existentes</h2><p class="muted small" style="margin:4px 0 0">Aceita os ZIPs (BANCOS, Cores), pastas inteiras ou arquivos soltos. Nomes originais são preservados; só o título exibido é normalizado. Imagens só são ligadas a um veículo quando o modelo aparece no nome do arquivo ou da pasta — sem adivinhar versão ou cor.</p></div>
    <div class="upl" id="drop"><div style="color:var(--blue)">${ico('upload', 'lg')}</div><b>Arraste ZIPs, pastas ou arquivos aqui</b><div class="muted small">ou escolha abaixo</div>
      <div class="row" style="justify-content:center;margin-top:12px"><label class="btn">ZIP ou arquivos<input type="file" id="impArq" multiple accept=".zip,image/*,video/*" hidden></label><label class="btn">Pasta<input type="file" id="impPasta" webkitdirectory multiple hidden></label></div></div>
    <label class="f" style="max-width:380px">Categoria padrão para vídeos sem pista no nome<select id="impCat">${categoriasMidia().map(([k, n]) => `<option value="${k}" ${k === 'outros' ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
    <div id="impProg" hidden><div class="prog"><i id="impBar"></i></div><div class="small muted" id="impTxt" style="margin-top:6px"></div></div><div id="impRes"></div>
    <div class="card pad" style="background:rgba(255,255,255,.02)"><h3>Importar catálogo em lote (JSON)</h3><p class="small muted" style="margin:4px 0 10px">Cadastra vários carros de uma vez, com planos, fotos (URLs) e vídeos (links). Mesmo carro + locadora é atualizado, não duplicado.</p>
      <label class="btn">Escolher JSON<input type="file" id="impCatalogo" accept="application/json,.json" hidden></label>
      <details style="margin-top:10px"><summary class="small muted" style="cursor:pointer">Formato esperado</summary><pre style="font-size:11.5px;background:var(--soft);padding:10px;border-radius:10px;overflow:auto">{ "veiculos": [{
  "marca": "Fiat", "modelo": "Pulse", "versao": "Drive 1.3", "ano": "2025/2026",
  "categoria": "suv", "locadora": "Movida", "cambio": "Automático", "combustivel": "Flex",
  "lugares": 5, "fonte": "Catálogo Movida em 27/10/2026",
  "planos": [{ "prazo": 24, "km": 1000, "mensalidade": 2890.00 }],
  "fotos": ["https://.../pulse.jpg"],
  "videos": [{ "titulo": "Interior", "url": "https://youtu.be/...", "categoria": "interior" }]
}]}</pre></details><div id="impCatRes" style="margin-top:10px"></div></div>
    <div class="xs muted">Regras: pasta/arquivo com “banco, extrato, cartão…” → Tutoriais de bancos e documentos (separado dos vídeos comerciais). “Movida/Localiza” no nome vincula a locadora. “retirada/depoimento” entra como restrito até a autorização ser confirmada. Arquivos ficam no navegador (IndexedDB) até o Hub ser hospedado com Supabase Storage.</div></div>`;
}
function adDados() {
  const demo = S.veiculos.some(v => v.demo);
  return `<div class="grid g-2"><div class="card pad" style="display:grid;gap:10px"><h2>Backup</h2><p class="small muted">Exporta cadastros (veículos, locadoras, templates, metadados de mídia). Os arquivos de foto e vídeo ficam no navegador e <b>não</b> entram no JSON.</p>
    <div class="row"><button class="btn primary" data-act="exportar">${ico('download', 'sm')} Exportar JSON</button><label class="btn">Importar JSON<input type="file" id="impJson" accept="application/json,.json" hidden></label></div></div>
    <div class="card pad" style="display:grid;gap:10px"><h2>Dados de demonstração</h2><p class="small muted">Três veículos fictícios (“Demo”), sempre marcados como DEMONSTRAÇÃO, para testar o layout. Não representam ofertas reais.</p>
    <div class="row">${demo ? '<button class="btn danger" data-act="removerDemo">Remover demonstração</button>' : '<button class="btn" data-act="carregarDemo">Carregar demonstração</button>'}</div></div>
    <div class="card pad" style="display:grid;gap:10px"><h2>Armazenamento</h2><p class="small muted" id="storageInfo">Calculando...</p></div>
    <div class="card pad" style="display:grid;gap:10px"><h2 style="color:var(--bad)">Zona de risco</h2><p class="small muted">Apaga todos os dados e arquivos deste navegador e volta ao cadastro-base.</p><div><button class="btn danger" data-act="resetTudo">Apagar tudo</button></div></div></div>`;
}


/* ===== vincular midias aos veiculos pelo NOME do arquivo/titulo ===== */
const AV_STOP = new Set('flex aut autom automatico automatica manual turbo com sem pack base plus novo nova cd cs ce tb mpi tsi gdi tgdi 4x2 4x4 5p 4p 12v 16v 8v 6v diesel gasolina hibrido mec mecanico cabine dupla simples sedan hatch'.split(' '));
const avToks = s => norm(s).match(/[a-z0-9]+(?:\.[0-9]+)?/g) || [];
const avCil = s => { const m = String(s || '').match(/(?<!\d)(\d)[.,](\d)(?!\d)/); return m ? m[1] + '.' + m[2] : null; };
const avTrans = s => { const n = norm(s); if (/\b(aut|autom|automatico|automatica|cvt|dct|at)\b/.test(n)) return 'A'; if (/\b(manual|mt|mec)\b/.test(n)) return 'M'; return null; };
function avCasar(texto) {
  const txt = ' ' + avToks(texto.replace(/-/g, ' ')).join(' ') + ' ', grupos = new Map();
  for (const v of veiculosAtivos()) { if (v.demo) continue; const k = modeloChaveDe(v); if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(v); }
  let achados = [];
  for (const [k, vs] of grupos) {
    const mt = avToks(vs[0].modelo.replace(/-/g, ' ')); if (!mt.length) continue;
    const alvo = mt.join(''); let ok = txt.includes(' ' + mt.join(' ') + ' ');
    if (!ok && alvo.length >= 3) { const ft = txt.trim().split(' '); ok = [1, 2, 3].some(w => ft.some((_, i) => ft.slice(i, i + w).join('') === alvo)); }   // "HRV" x "HR-V"
    if (ok) achados.push([alvo.length, vs]);
  }
  if (!achados.length) return null;
  achados.sort((x, y) => y[0] - x[0]); achados = achados.filter(x => x[0] === achados[0][0]);
  if (achados.length > 1) return null;                         // modelo ambiguo: nao arrisca
  const vs = achados[0][1], ft = new Set(avToks(texto));
  const pont = vs.map(v => {
    const mt = avToks(v.modelo), vt = avToks(v.versao).filter(t => t.length >= 3 && !AV_STOP.has(t) && !/^[\d.]+v?$/.test(t) && !mt.includes(t));
    let p = 3 * new Set(vt.filter(t => ft.has(t))).size;
    const cv = avCil(v.versao), cf = avCil(texto), tv = avTrans(v.versao), tf = avTrans(texto);
    if (cv && cf) p += cv === cf ? 2 : -6; if (tv && tf) p += tv === tf ? 1 : -6;
    return [p, v];
  }).sort((x, y) => y[0] - x[0]);
  if (pont[0][0] >= 4 && (pont.length === 1 || pont[0][0] > pont[1][0])) return { v: pont[0][1], modelo: false };
  return { v: vs[0], modelo: true };                           // so o modelo: vale para todas as versoes
}
function marcarMarcaDagua() {
  const lista = new Set(window.VIDEOS_MARCA_DAGUA || []); if (!lista.size) return;
  for (const m of S.midias) if (m.tipo === 'video' && lista.has(String(m.nomeOriginal || '').split('/').pop())) m.tags = [...new Set([...(m.tags || []), 'marca-dagua-terceiros'])];
}
async function autoVincularMidias() {
  const plano = [], soltar = [];
  for (const m of S.midias) {
    if (m.tipo !== 'video' || m.cliente || m.arquivado || ehSugerida(m) || (m.tags || []).includes('reel-dryve')) continue;
    const r = avCasar([m.titulo, m.nomeOriginal].filter(Boolean).join(' ').replace(/\.(mp4|mov|m4v|webm)\b/gi, ' '));
    if (!r) { if (m.categoria === 'outros' && m.veiculoId && !(m.tags || []).includes('vinculado-pelo-nome')) soltar.push(m); continue; }   // sem carro no nome, preso a um carro qualquer
    const atual = veiculo(m.veiculoId), mesmoModelo = atual && modeloChaveDe(atual) === modeloChaveDe(r.v);
    if (mesmoModelo && (r.modelo ? !!m.modeloChave : m.veiculoId === r.v.id) && m.categoria !== 'outros') continue;
    plano.push([m, r]);
  }
  marcarMarcaDagua();
  if (!plano.length && !soltar.length) { salvar(); return toast('Nada a vincular: todos os vídeos já estão ligados ou o nome não cita um carro do catálogo.'); }
  const porVersao = plano.filter(([, r]) => !r.modelo).length;
  if (!await confirmar({ titulo: 'Vincular pelo nome do arquivo?', texto: `Vou ligar <b>${plano.length}</b> vídeo(s) ao carro citado no nome: <b>${porVersao}</b> na versão exata e <b>${plano.length - porVersao}</b> no modelo (valem para todas as versões). A categoria "Outros" vira "Vídeo completo do carro".${soltar.length ? ` Outros <b>${soltar.length}</b> não citam carro no nome e ficam como material geral (sem veículo).` : ''} Você pode ajustar qualquer um depois em Editar.`, btn: 'Vincular', perigo: false })) return;
  for (const m of soltar) { m.veiculoId = ''; m.modeloChave = ''; }
  for (const [m, r] of plano) {
    m.veiculoId = r.v.id; m.locadoraId = m.locadoraId || r.v.locadoraId || ''; m.modeloChave = r.modelo ? modeloChaveDe(r.v) : '';
    if (!m.categoria || m.categoria === 'outros') m.categoria = /\b(interna|interior|por dentro|painel)\b/.test(norm(m.titulo + ' ' + m.nomeOriginal)) ? 'interior' : 'avaliacao';
    m.tags = [...new Set([...(m.tags || []), 'vinculado-pelo-nome'])];
  }
  salvar(); toast(`${plano.length} vídeo(s) vinculados (${porVersao} por versão, ${plano.length - porVersao} por modelo).`); rotear();
}
