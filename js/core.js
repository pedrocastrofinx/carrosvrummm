'use strict';
/* ===== utilitários ===== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const uid = p => p + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
const agora = () => new Date().toISOString();
const NI = 'Não informado';
const num = v => (v === '' || v == null || isNaN(Number(v))) ? null : Number(v);
const brl = n => n == null ? NI : Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) + '/mês';
const brlSimples = n => n == null ? NI : Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataBR = iso => iso ? new Date(iso).toLocaleDateString('pt-BR') : NI;
const dataHoraBR = iso => iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : NI;
const val = v => (v === null || v === undefined || v === '' || (Array.isArray(v) && !v.length)) ? null : v;
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

/* ===== ícones (traços no estilo Lucide) ===== */
const IC = {
  home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  car: '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',
  building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>',
  video: '<path d="m22 8-6 4 6 4V8Z"/><rect x="2" y="6" width="14" height="12" rx="2"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  sparkles: '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z"/>',
  star: '<polygon points="12 2 15.1 8.3 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 8.9 8.3 12 2"/>',
  sliders: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  play: '<polygon points="6 3 20 12 6 21 6 3"/>',
  expand: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>',
  menu: '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  arrowleft: '<path d="m12 19-7-7 7-7M19 12H5"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  send: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
  grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
  list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
  external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/>',
  folder: '<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9l-.8-1.2A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  refresh: '<path d="M21 12a9 9 0 0 0-15-6.7L3 8M3 3v5h5M3 12a9 9 0 0 0 15 6.7L21 16M21 21v-5h-5"/>',
  tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z"/><path d="M7 7h.01"/>',
  alert: '<path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3z"/><path d="M12 9v4M12 17h.01"/>'
};
const ico = (n, c = '') => `<svg class="i ${c}" viewBox="0 0 24 24" aria-hidden="true">${IC[n] || ''}</svg>`;

/* ===== taxonomias ===== */
const CATEGORIAS_VEICULO = [['economico', 'Econômico'], ['hatch', 'Hatch'], ['sedan', 'Sedan'], ['suv', 'SUV'], ['picape', 'Picape'], ['eletrico', 'Elétrico'], ['utilitario', 'Utilitário'], ['premium', 'Premium']];
const CATEGORIAS_MIDIA_BASE = [
  ['exterior', 'Exterior dos veículos'], ['interior', 'Interior dos veículos'], ['painel', 'Painel e multimídia'],
  ['demonstracao', 'Demonstrações de funcionalidades'], ['retirada', 'Retirada e entrega de veículos'], ['depoimento', 'Depoimentos de clientes'],
  ['tutorial_atendimento', 'Tutoriais de atendimento'], ['tutorial_bancos', 'Tutoriais de bancos e documentos'], ['apoio_locadora', 'Materiais de apoio das locadoras'],
  ['portamalas', 'Porta-malas'], ['bancos', 'Bancos'], ['detalhes', 'Detalhes relevantes'], ['foto_geral', 'Fotos do veículo (geral)'], ['avaliacao', 'Vídeo completo do carro (interno e externo)'], ['outros', 'Outros']
];
/* grupos da ficha do veículo ("avaliacao" cobre o carro por dentro e por fora, então aparece nas duas abas) */
const GRUPOS_VIDEO = {
  externos: ['exterior', 'avaliacao', 'outros'],
  internos: ['interior', 'painel', 'demonstracao', 'portamalas', 'bancos', 'avaliacao'],
  clientes: ['retirada', 'depoimento']
};
const CATS_COMERCIAIS = ['exterior', 'interior', 'painel', 'demonstracao', 'retirada', 'depoimento', 'portamalas', 'bancos', 'detalhes', 'foto_geral', 'avaliacao'];
const CATS_APOIO = ['tutorial_atendimento', 'tutorial_bancos', 'apoio_locadora'];
const AUTORIZACAO = { autorizado: ['Uso autorizado', 'ok'], pendente: ['Autorização pendente', 'warn'], nao_autorizado: ['Não liberado', 'bad'] };
const CAMBIOS = ['Manual', 'Automático', 'Automatizado', 'CVT'];
const COMBUSTIVEIS = ['Flex', 'Gasolina', 'Diesel', 'Elétrico', 'Híbrido'];

/* ===== estado persistido ===== */
const KEY = 'dryve_hub_v1';
let S;
function seed() {
  const t = agora();
  return {
    v: 1,
    locadoras: [
      { id: 'loc_movida', nome: 'Movida', logoUrl: '', descricao: '', site: 'https://www.movidacarroporassinatura.com.br', catalogoUrl: 'https://www.movidacarroporassinatura.com.br/assinatura/busca', contato: '', obs: '', atualizadoEm: t },
      { id: 'loc_localiza', nome: 'Localiza', logoUrl: '', descricao: '', site: 'https://assinatura.localiza.com', catalogoUrl: 'https://assinatura.localiza.com/carros', contato: '', obs: '', atualizadoEm: t }
    ],
    /* Cadastro-base: só identificação (marca/modelo/categoria). Preço, versão, locadora etc. ficam "Não informado" até alguém preencher. */
    veiculos: [
      ['Fiat', 'Mobi', 'hatch'], ['Fiat', 'Pulse', 'suv'], ['Fiat', 'Argo', 'hatch'], ['Chevrolet', 'Onix', 'hatch'],
      ['Renault', 'Kwid', 'hatch'], ['Hyundai', 'HB20', 'hatch'], ['Volkswagen', 'Tera', 'suv'], ['Jeep', 'Compass', 'suv']
    ].map(([marca, modelo, categoria]) => novoVeiculo({ id: 'v_' + norm(modelo), marca, modelo, categoria, fonte: 'Cadastro base — completar na Administração' })),
    midias: [],
    templates: [
      { id: 'tpl_veiculo', tipo: 'veiculo', nome: 'Apresentação de veículo', arquivado: false, corpo: 'Olá! Separei uma opção de veículo por assinatura que pode combinar com o que você procura. 🚗\nVeículo: {{marca_modelo}}\nVersão: {{versao}}\nLocadora: {{locadora}}\nMensalidade: {{mensalidade}}\nPlano: {{prazo}} meses | {{quilometragem}} km/mês\nConfira os detalhes: {{link_veiculo}}\nSe quiser, posso te ajudar a entender melhor essa opção!' },
      { id: 'tpl_video', tipo: 'video', nome: 'Envio de vídeo do veículo', arquivado: false, corpo: 'Separei este vídeo para você conhecer melhor o {{marca_modelo}}! 🚘\nAssim você consegue visualizar alguns detalhes do veículo antes de decidir.\n{{link_video}}\nSe tiver alguma dúvida sobre o modelo ou as condições da assinatura, pode me chamar!' },
      { id: 'tpl_interior', tipo: 'interior', nome: 'Envio de vídeo do interior', arquivado: false, corpo: 'Olha só alguns detalhes do interior do {{marca_modelo}}! 👀\nNeste vídeo você consegue conhecer melhor o painel, o acabamento e o espaço interno.\n{{link_video}}\nO que achou dessa opção?' },
      { id: 'tpl_retirada', tipo: 'retirada', nome: 'Envio de vídeo de retirada', arquivado: false, corpo: 'Também separei este vídeo para você conhecer um pouco mais da experiência de retirada do veículo. 🚗\n{{link_video}}\nSe quiser, posso te ajudar a encontrar uma opção que combine com a sua necessidade!' }
    ],
    catsExtras: [], catalogosImportados: [],
    favoritos: { veiculos: [], midias: [] },
    hist: { veiculos: [], midias: [], views: {}, tplUso: {} },
    config: { papel: 'admin', usuario: 'Pedro Castro', baseUrl: '', cloveEndpoint: '' },
    clove: { historico: [] }
  };
}
function novoVeiculo(o = {}) {
  return Object.assign({
    id: uid('v'), marca: '', modelo: '', versao: '', ano: '', categoria: '', locadoraId: '', cambio: '', combustivel: '', lugares: null, portas: null,
    motor: '', potencia: '', consumo: '', portaMalas: '', dimensoes: '', equipamentos: [], conforto: [], seguranca: [], conectividade: [], comparacao: '',
    planos: [], disponibilidade: '', entregaRapida: null, condicoes: '', fonte: '', fotoChave: [], fichaUrl: '', segmento: '', fabricanteFonte: '', fotoPrincipalId: '', arquivado: false, demo: false, atualizadoEm: agora()
  }, o);
}
function carregar() {
  try { const raw = localStorage.getItem(KEY); S = raw ? JSON.parse(raw) : seed(); } catch (e) { S = seed(); }
  const base = seed();
  for (const k of Object.keys(base)) if (S[k] === undefined) S[k] = base[k];
  for (const k of Object.keys(base.config)) if (S.config[k] === undefined) S.config[k] = base.config[k];
  for (const k of Object.keys(base.hist)) if (S.hist[k] === undefined) S.hist[k] = base.hist[k];
  if (window.DRYVE) { S.config.papel = window.DRYVE.papel; S.config.usuario = window.DRYVE.email || S.config.usuario; }
}
let _t;
function salvar() {
  clearTimeout(_t);
  _t = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(S)); }
    catch (e) { toast('Não foi possível salvar: armazenamento do navegador cheio.', 'err'); }
    if (window.Nuvem) window.Nuvem.sincronizar();
  }, 120);
}
const isAdmin = () => window.DRYVE ? window.DRYVE.papel === 'admin' : S.config.papel === 'admin';   // hospedado: o papel vem do Supabase (tabela perfis)
const categoriasMidia = () => CATEGORIAS_MIDIA_BASE.concat(S.catsExtras.map(c => [c.key, c.nome]));
const nomeCat = k => (categoriasMidia().find(c => c[0] === k) || [k, k || 'Sem categoria'])[1];
const nomeCatVeic = k => (CATEGORIAS_VEICULO.find(c => c[0] === k) || [k, k || NI])[1];

/* ===== consultas ===== */
const locadora = id => S.locadoras.find(l => l.id === id);
const veiculo = id => S.veiculos.find(v => v.id === id);
const midia = id => S.midias.find(m => m.id === id);
const veiculosAtivos = () => S.veiculos.filter(v => !v.arquivado);
const modeloChaveDe = v => v ? norm(v.marca + '|' + v.modelo) : '';
const midiasDe = vid => S.midias.filter(m => (m.veiculoId === vid || (m.modeloChave && m.modeloChave === modeloChaveDe(veiculo(vid)))) && !m.arquivado);
/* referencias do YouTube (tag sugerido-auto) ficam ocultas por padrao: sao so consulta, nao baixaveis */
const ehSugerida = m => (m.tags || []).includes('sugerido-auto');
function aplicarSugeridas() { for (const m of S.midias) if (ehSugerida(m)) m.arquivado = !S.config.mostrarSugeridos; }
const nomeVeiculo = v => v ? [v.marca, v.modelo, v.versao].filter(Boolean).join(' ') : '';
const marcaModelo = v => v ? [v.marca, v.modelo].filter(Boolean).join(' ') : '';
const precoMin = v => { const p = (v.planos || []).map(p => p.mensalidade).filter(x => x != null); return p.length ? Math.min(...p) : null; };
const planoPrincipal = v => (v.planos || []).slice().sort((a, b) => (a.mensalidade ?? 1e12) - (b.mensalidade ?? 1e12))[0] || null;
/* autorização de uso: vídeo de cliente só circula quando marcado como autorizado */
const compartilhavel = m => m.autorizacao !== 'nao_autorizado' && !(m.cliente && m.autorizacao !== 'autorizado');
const bloqueada = m => !compartilhavel(m) && !isAdmin();
const hubUrl = () => S.config.baseUrl ? S.config.baseUrl.replace(/\/?$/, '/') : location.href.split('#')[0];
const linkVeiculo = v => hubUrl() + '#/veiculo/' + v.id;
const linkMidia = m => (m.origem === 'link' && m.url) ? m.url : hubUrl() + '#/midia/' + m.id;
const linkMidiaInterno = m => m.origem !== 'link' && !S.config.baseUrl && !window.DRYVE;

function camposFaltando(v) {
  const f = [];
  const t = (c, n) => { if (!val(v[c])) f.push(n); };
  t('versao', 'Versão'); t('ano', 'Ano/modelo'); t('categoria', 'Categoria'); t('locadoraId', 'Locadora'); t('cambio', 'Câmbio'); t('combustivel', 'Combustível');
  t('lugares', 'Número de lugares'); t('motor', 'Motorização'); t('portaMalas', 'Porta-malas');
  if (!(v.planos || []).some(p => p.mensalidade != null)) f.push('Mensalidade / plano');
  t('disponibilidade', 'Disponibilidade'); t('fonte', 'Fonte da informação');
  if (!midiasDe(v.id).some(m => m.tipo === 'foto')) f.push('Foto');
  return f;
}
function grupoVideos(vid, grupo) { return midiasDe(vid).filter(m => m.tipo === 'video' && GRUPOS_VIDEO[grupo].includes(m.categoria)); }

/* ===== IndexedDB (arquivos grandes ficam fora do localStorage) ===== */
const DB = {
  db: null,
  open() {
    return new Promise((res, rej) => {
      const r = indexedDB.open('dryve_hub', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('files');
      r.onsuccess = () => { DB.db = r.result; res(); };
      r.onerror = () => rej(r.error);
    });
  },
  tx(mode, fn) { return new Promise((res, rej) => { const t = DB.db.transaction('files', mode); const rq = fn(t.objectStore('files')); t.oncomplete = () => res(rq && rq.result); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); }); },
  put(id, rec) { return DB.tx('readwrite', s => s.put(rec, id)); },
  get(id) { return DB.tx('readonly', s => s.get(id)); },
  del(id) { return DB.tx('readwrite', s => s.delete(id)); }
};
const urlCache = new Map();
async function fileURL(id) {
  if (!id) return null;
  if (String(id).startsWith('cloud:')) return window.Nuvem ? window.Nuvem.urlAssinada(id.slice(6)) : null;
  if (urlCache.has(id)) return urlCache.get(id);
  const rec = await DB.get(id).catch(() => null);
  if (!rec) return null;
  const u = URL.createObjectURL(rec.blob);
  urlCache.set(id, u);
  return u;
}
async function hidratar(root = document) {
  for (const img of $$('img[data-fid]:not([src])', root)) fileURL(img.dataset.fid).then(u => { if (u) img.src = u; else img.replaceWith(Object.assign(document.createElement('span'), { className: 'xs muted', textContent: 'arquivo indisponível' })); });
  for (const vd of $$('video[data-vfid]:not([src])', root)) fileURL(vd.dataset.vfid).then(u => { if (u) vd.src = u; });
}
function gerarThumb(blob) {
  return new Promise(res => {
    const v = document.createElement('video'); v.muted = true; v.preload = 'metadata'; v.playsInline = true;
    const url = URL.createObjectURL(blob);
    const fim = b => { clearTimeout(tm); URL.revokeObjectURL(url); res(b); };
    const tm = setTimeout(() => fim(null), 7000);
    v.onloadeddata = () => { v.currentTime = Math.min(1, (v.duration || 2) / 2); };
    v.onseeked = () => {
      try {
        const c = document.createElement('canvas'); c.width = 480; c.height = Math.round(480 * (v.videoHeight || 9) / (v.videoWidth || 16));
        c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
        c.toBlob(b => fim(b), 'image/jpeg', .72);
      } catch (e) { fim(null); }
    };
    v.onerror = () => fim(null);
    v.src = url;
  });
}

/* ===== UI base: toast, copiar, modal, confirmação ===== */
function toast(msg, tipo = '') {
  const el = document.createElement('div'); el.className = 'toast ' + tipo;
  el.innerHTML = (tipo === 'err' ? ico('alert', 'sm') : ico('check', 'sm')) + `<span>${esc(msg)}</span>`;
  $('#toasts').appendChild(el); setTimeout(() => el.remove(), tipo === 'err' ? 5000 : 2600);
}
async function copiar(texto, ok = 'Copiado!') {
  try { await navigator.clipboard.writeText(texto); }
  catch (e) {
    const ta = document.createElement('textarea'); ta.value = texto; ta.style.position = 'fixed'; ta.style.opacity = 0; document.body.appendChild(ta); ta.select();
    let sucesso = false; try { sucesso = document.execCommand('copy'); } catch (_) { }
    ta.remove(); if (!sucesso) { toast('Não foi possível copiar automaticamente. Selecione e copie manualmente.', 'err'); return false; }
  }
  toast(ok); return true;
}
let modalFecharCb = null;
function abrirModal(html, { tam = '', onClose } = {}) {
  fecharModal(true);
  modalFecharCb = onClose || null;
  $('#modalRoot').innerHTML = `<div class="modal-bg" data-act="modalBg"><div class="modal ${tam}" role="dialog" aria-modal="true">${html}</div></div>`;
  hidratar($('#modalRoot'));
  const f = $('#modalRoot input:not([type=hidden]),#modalRoot textarea,#modalRoot select'); if (f && !$('#modalRoot video')) f.focus();
}
function fecharModal(silencioso) {
  const r = $('#modalRoot'); if (!r.innerHTML) return;
  r.querySelectorAll('video').forEach(v => v.pause());
  r.innerHTML = ''; const cb = modalFecharCb; modalFecharCb = null; if (cb && !silencioso) cb();
}
function confirmar({ titulo = 'Confirmar', texto = '', btn = 'Confirmar', perigo = true }) {
  return new Promise(res => {
    const r = $('#confirmRoot');
    r.innerHTML = `<div class="modal-bg" style="z-index:150"><div class="modal" role="alertdialog" aria-modal="true"><div class="modal-h"><h2>${esc(titulo)}</h2></div><div class="modal-b">${texto}</div><div class="modal-f"><button class="btn" data-c="0">Cancelar</button><button class="btn ${perigo ? 'danger' : 'primary'}" data-c="1">${esc(btn)}</button></div></div></div>`;
    r.onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; r.innerHTML = ''; r.onclick = null; res(b.dataset.c === '1'); };
    r.querySelector('[data-c="1"]').focus();
  });
}
function vazio(icone, titulo, texto, acaoHtml = '') {
  return `<div class="empty"><div class="ico">${ico(icone, 'lg')}</div><h3>${esc(titulo)}</h3><p>${texto}</p>${acaoHtml}</div>`;
}

/* ===== mensagens padronizadas ===== */
function preencher(corpo, ctx) {
  const faltando = new Set(), out = [];
  for (const l of corpo.split('\n')) {
    let miss = false;
    const r = l.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => { const v = ctx[k]; if (v == null || v === '') { faltando.add(k); miss = true; return ''; } return v; });
    if (!miss) out.push(r);
  }
  return { texto: out.join('\n').replace(/\n{3,}/g, '\n\n').trim(), faltando: [...faltando] };
}
const ROTULO_CAMPO = { marca_modelo: 'Veículo', versao: 'Versão', locadora: 'Locadora', mensalidade: 'Mensalidade', prazo: 'Prazo', quilometragem: 'Quilometragem', link_veiculo: 'Link do veículo', link_video: 'Vídeo' };
function ctxMensagem({ v, plano, m }) {
  const p = plano || (v && planoPrincipal(v));
  return {
    marca_modelo: v ? marcaModelo(v) : '', versao: v?.versao || '', locadora: v && locadora(v.locadoraId)?.nome || '',
    mensalidade: p?.mensalidade != null ? brl(p.mensalidade) : '', prazo: p?.prazo ?? '', quilometragem: p?.km != null ? Number(p.km).toLocaleString('pt-BR') : '',
    link_veiculo: v ? linkVeiculo(v) : '', link_video: m ? linkMidia(m) : ''
  };
}
function templatePara(m) {
  const tipo = m && m.categoria === 'interior' || m && m.categoria === 'painel' ? 'interior' : m && ['retirada', 'depoimento'].includes(m.categoria) ? 'retirada' : 'video';
  return S.templates.find(t => t.tipo === tipo && !t.arquivado) || S.templates.find(t => !t.arquivado);
}
function mensagemMidia(m) {
  const v = veiculo(m.veiculoId); const tpl = templatePara(m);
  if (!tpl) return { texto: '', faltando: [] };
  S.hist.tplUso[tpl.id] = (S.hist.tplUso[tpl.id] || 0) + 1; salvar();
  return preencher(tpl.corpo, ctxMensagem({ v, m }));
}

/* ===== histórico e favoritos ===== */
function registrarVeiculo(id) {
  const h = S.hist; h.veiculos = [{ id, ts: agora() }, ...h.veiculos.filter(x => x.id !== id)].slice(0, 30);
  h.views[id] = (h.views[id] || 0) + 1; salvar();
}
function registrarMidia(id) { const h = S.hist; h.midias = [{ id, ts: agora() }, ...h.midias.filter(x => x.id !== id)].slice(0, 30); salvar(); }
function alternarFav(tipo, id) {
  const l = S.favoritos[tipo], i = l.indexOf(id);
  if (i >= 0) l.splice(i, 1); else l.unshift(id);
  salvar(); return i < 0;
}
const ehFav = (tipo, id) => S.favoritos[tipo].includes(id);

/* ===== demonstração (separada dos dados reais) ===== */
function carregarDemo() {
  if (S.veiculos.some(v => v.demo)) return false;
  if (!S.locadoras.some(l => l.id === 'loc_demo')) S.locadoras.push({ id: 'loc_demo', nome: 'Locadora Demo', logoUrl: '', descricao: 'DEMONSTRAÇÃO — não é parceira real.', site: '', catalogoUrl: '', contato: '', obs: 'Registro fictício para demonstrar o layout.', atualizadoEm: agora(), demo: true });
  const base = { locadoraId: 'loc_demo', demo: true, fonte: 'DEMONSTRAÇÃO (dado fictício)', disponibilidade: 'Disponível', cambio: 'Automático', combustivel: 'Flex', lugares: 5, portas: 4 };
  S.veiculos.push(
    novoVeiculo({ ...base, id: 'v_demo1', marca: 'Demo', modelo: 'Alfa', versao: 'Comfort', ano: '2025/2026', categoria: 'hatch', planos: [{ prazo: 24, km: 1000, mensalidade: 1990, taxas: '', condicoes: '' }, { prazo: 36, km: 1500, mensalidade: 1890, taxas: '', condicoes: '' }] }),
    novoVeiculo({ ...base, id: 'v_demo2', marca: 'Demo', modelo: 'Beta', versao: 'Premium', ano: '2025/2026', categoria: 'suv', lugares: 5, planos: [{ prazo: 24, km: 1500, mensalidade: 2890, taxas: '', condicoes: '' }] }),
    novoVeiculo({ ...base, id: 'v_demo3', marca: 'Demo', modelo: 'Gama', versao: 'Elétrico', ano: '2026', categoria: 'eletrico', cambio: 'Automático', combustivel: 'Elétrico', planos: [{ prazo: 12, km: 1000, mensalidade: 3590, taxas: '', condicoes: '' }] })
  );
  S.templates.length || 0; salvar(); return true;
}
function removerDemo() {
  const ids = new Set(S.veiculos.filter(v => v.demo).map(v => v.id));
  S.midias.filter(m => ids.has(m.veiculoId)).forEach(m => apagarArquivosMidia(m));
  S.midias = S.midias.filter(m => !ids.has(m.veiculoId));
  S.veiculos = S.veiculos.filter(v => !v.demo);
  S.locadoras = S.locadoras.filter(l => !l.demo);
  salvar();
}
function apagarArquivosMidia(m) { [m.fileId, m.thumbId, ...(m.frames || []).map(f => f.fileId)].filter(id => id && !S.midias.some(o => o !== m && (o.fileId === id || o.thumbId === id))).forEach(id => { if (String(id).startsWith('cloud:')) { if (window.Nuvem) window.Nuvem.remover(id); return; } DB.del(id).catch(() => { }); urlCache.delete(id); }); }
