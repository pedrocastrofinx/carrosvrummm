// Coleta os catalogos PUBLICOS da Movida e da Localiza e gera data/catalogo-*.js (mesmo formato que o Hub ja importa).
// Abre as paginas num navegador de verdade (Chromium/Edge), como um visitante, e le o que o proprio site carrega:
//   - Movida: resposta JSON de /api/v5/catalog (o site obtem o token sozinho; nada de login e nenhuma credencial aqui)
//   - Localiza: paginacao da lista /carros (mesma chamada do botao "Mostrar mais"; 175 modelos, 9 por pagina)
// Precos da Localiza NAO sao publicos e nao sao coletados. Eles vem da tabela privada (Supabase), ver README-DEPLOY.md.
//
// Uso: node tools/coletar_catalogos.mjs [--saida pasta] [--so movida|localiza]
// Seguranca: se a coleta vier com menos de 70% do que ja existia, NADA e gravado e o processo sai com erro.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const SAIDA = path.resolve(opt('saida', path.join(RAIZ, 'data')));
const SO = opt('so', '');
const LIMITE_QUEDA = 0.7;

const hojeBR = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date()); // AAAA-MM-DD
const dataBR = d => d.split('-').reverse().join('/');
const dorme = ms => new Promise(r => setTimeout(r, ms));
const slug = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/* alguns campos da Localiza chegam com UTF-8 lido como latin-1 ("UtilitÃ¡rio"): conserta so quando tem cara disso */
function conserta(s) {
  if (typeof s !== 'string' || !/[\u00c2\u00c3]/.test(s)) return s;
  const t = Buffer.from(s, 'latin1').toString('utf8');
  return t.includes('\ufffd') ? s : t;
}
const limpa = o => Array.isArray(o) ? o.map(limpa) : (o && typeof o === 'object') ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, limpa(v)])) : conserta(o);

function lerAnterior(arquivo) {
  try {
    const t = fs.readFileSync(arquivo, 'utf8');
    return JSON.parse(t.slice(t.indexOf('push(') + 5, t.lastIndexOf(')'))).veiculos || [];
  } catch { return []; }
}

function navegador() {
  const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
  const executablePath = process.env.CHROME_PATH || (process.platform === 'win32' && fs.existsSync(edge) ? edge : undefined);
  return chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
}

/* ---------------- MOVIDA ---------------- */
const SIGLAS = new Set(['TSI', 'TB', 'CVT', 'CS', 'CD', 'CE', 'AT', 'MT', 'GT', 'VW', 'GLX', 'LTZ', 'LT', 'RS', 'SE', 'XS', 'TCE', 'EV', 'HEV', 'PHEV', 'ABS', 'SUV', 'DCT']);
function tituloVersao(texto, modelo) {
  let t = String(texto || '').trim();
  const m = String(modelo || '').trim();
  if (m && t.toUpperCase().startsWith(m.toUpperCase() + ' ')) t = t.slice(m.length + 1);
  return t.split(/\s+/).map(w => {
    if (/\d/.test(w) || /^[+\-\/()]+$/.test(w)) return w;
    const base = w.replace(/[().,]/g, '').toUpperCase();
    if (SIGLAS.has(base)) return w.toUpperCase();
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }).join(' ');
}
/* a CDN da Localiza bloqueia (403) quem nao e o proprio site; o endpoint de imagem do site entrega o mesmo arquivo (WebP transparente) */
const fotoLocaliza = u => 'https://assinatura.localiza.com/_next/image?url=' + encodeURIComponent(u) + '&w=700&q=75';
const marcaMovida = b => String(b || '').replace(/^GM\s*-\s*/i, '').trim();
const catMovida = c => ({ hatch: 'hatch', sedan: 'sedan', suv: 'suv', picape: 'picape', premium: 'premium', eletrico: 'eletrico' })[slug(c)] || '';
const fichaMovida = a => `https://www.movidacarroporassinatura.com.br/assinatura/detalhes/${encodeURIComponent(a.model)}-${encodeURIComponent(a.brand)}/${a.pdmVersionId}`;

async function coletarMovida(browser, hoje) {
  const ctx = await browser.newContext({ locale: 'pt-BR' });
  const page = await ctx.newPage();
  let corpo = null;
  page.on('response', async r => { if (r.url().endsWith('/api/v5/catalog') && r.status() === 200) corpo = await r.json().catch(() => null); });
  await page.goto('https://www.movidacarroporassinatura.com.br/assinatura/busca', { waitUntil: 'domcontentloaded', timeout: 60000 });
  for (let i = 0; i < 40 && !corpo; i++) await dorme(1000);
  await ctx.close();
  if (!corpo || !Array.isArray(corpo.data)) throw new Error('Movida: a resposta do catalogo nao veio');
  const ant = new Map(lerAnterior(path.join(SAIDA, 'catalogo-movida.js')).map(v => [String(v.fichaUrl).split('/').pop(), v]));
  const veiculos = corpo.data.map(a => {
    const antigo = ant.get(a.pdmVersionId);
    const p = a.prices || {};
    const plano = { prazo: p.period ?? null, km: p.km ?? null, mensalidade: p.priceStarting ?? null,
      condicoes: 'Mensalidade "a partir de" na lista da Movida' + (p.period ? ` (${p.period} meses, ${p.km ?? '?'} km/mes)` : '') + (p.pricePromotional ? `; promocional ${p.pricePromotional}` : '') + '.' };
    const fotos = Array.isArray(a.pictures) ? a.pictures : [];
    return {
      marca: marcaMovida(a.brand), modelo: a.model, versao: antigo?.versao || tituloVersao(a.version, a.model),
      categoria: antigo?.categoria || catMovida(a.category), locadora: 'Movida', planos: [plano], condicoes: '',
      fichaUrl: fichaMovida(a), fotoChave: fotos.length ? [fotos[fotos.length - 1].split('/').pop()] : (antigo?.fotoChave || []),
      fotos: (fotos.find(u => /-large\.webp$/.test(u)) || fotos[0]) ? [fotos.find(u => /-large\.webp$/.test(u)) || fotos[0]] : [],
      fonte: `Movida - lista de carros (movidacarroporassinatura.com.br/assinatura/busca), coletada automaticamente em ${dataBR(hoje)}.`,
      _id: a.pdmVersionId
    };
  });
  return veiculos;
}

/* ---------------- LOCALIZA ---------------- */
const gearLoc = g => { const n = slug(g); return n.startsWith('automatiz') ? 'Automatizado' : n.startsWith('automat') ? 'Automático' : n === 'manual' ? 'Manual' : n === 'cvt' ? 'CVT' : (n ? n.charAt(0).toUpperCase() + n.slice(1) : ''); };
function catLocaliza(cat, body) {
  const c = slug(cat), b = slug(body);
  if (c === 'premium') return 'premium';
  if (c === 'eletrico') return 'eletrico';
  if (['suv', 'picape', 'hatch', 'sedan'].includes(b)) return b;
  if (b === 'furgao') return 'utilitario';
  return '';
}
function paraVeiculoLoc(m, antigo, hoje) {
  const ano = (m.slug.match(/-(20\d\d)-/) || [])[1] || antigo?.ano || '';
  const seg = (m.category && m.bodywork && slug(m.category) !== slug(m.bodywork)) ? `${m.category} | ${m.bodywork}` : (m.category || m.bodywork || '');
  const itens = m.seriesItems || [];
  const lug = itens.map(i => /(\d+)\s*lugar/i.exec(i.label || '')).find(Boolean);
  const conforto = itens.filter(i => /ar-condicionado/.test(i.type)).map(i => i.label);
  const conectividade = itens.filter(i => /multim|conect|carplay|android/i.test(i.type + ' ' + i.label)).map(i => i.label);
  return {
    marca: m.brand, modelo: m.model, versao: antigo?.versao || m.description, ano, categoria: antigo?.categoria || catLocaliza(m.category, m.bodywork),
    locadora: 'Localiza', cambio: gearLoc(m.gear), combustivel: m.fuel || '', lugares: lug ? Number(lug[1]) : (antigo?.lugares ?? null),
    ...(conectividade.length ? { conectividade } : {}), ...(conforto.length ? { conforto } : {}), entregaRapida: m.fastDelivery === true,
    fichaUrl: `https://assinatura.localiza.com/personalize-seu-plano/${slug(m.category) || 'carros'}/${m.slug}`, segmentoOrigem: seg, condicoes: '',
    fonte: `Localiza Assinatura - lista de carros, coletada automaticamente em ${dataBR(hoje)}. Mensalidade, prazo e km nao constam na lista (ficam na pagina de cada carro).`,
    fotos: m.image ? [fotoLocaliza(m.image)] : [], _id: m.slug
  };
}

async function coletarLocaliza(browser, hoje) {
  const ctx = await browser.newContext({ locale: 'pt-BR', viewport: { width: 1400, height: 1000 } });
  const page = await ctx.newPage();
  let acao = null;
  page.on('request', r => { if (r.method() === 'POST' && r.url().endsWith('/carros') && r.headers()['next-action']) acao = { headers: r.headers() }; });
  await page.goto('https://assinatura.localiza.com/carros', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await dorme(3500);
  await page.getByRole('button', { name: 'Manter cookies' }).click({ timeout: 3000 }).catch(() => { });
  await page.getByText('Mostrar mais').first().click({ timeout: 15000 });   // o proprio site dispara a chamada de paginacao
  for (let i = 0; i < 20 && !acao; i++) await dorme(500);
  if (!acao) throw new Error('Localiza: nao consegui capturar a chamada de paginacao do site');
  const h = { 'next-action': acao.headers['next-action'], 'next-router-state-tree': acao.headers['next-router-state-tree'], accept: 'text/x-component', 'content-type': 'text/plain;charset=UTF-8' };
  const modelos = new Map(); let total = 0;
  for (let pg = 1; pg <= 40; pg++) {
    const txt = await page.evaluate(async ({ h, pg }) => {
      const r = await fetch('/carros', { method: 'POST', headers: h, body: JSON.stringify([pg, { categories: [], brand: [], cambio: [], combustivel: [], motor: [] }, '$undefined', '$undefined']) });
      return r.ok ? await r.text() : '';
    }, { h, pg });
    const linha = txt.split('\n').find(l => /^1:\{/.test(l));
    if (!linha) break;
    const j = limpa(JSON.parse(linha.slice(2)));
    total = j.registers || total;
    const antes = modelos.size;
    for (const m of j.models || []) if (m.slug) modelos.set(m.slug, m);
    if (!(j.models || []).length || modelos.size === antes || (total && modelos.size >= total)) break;
    await dorme(700);
  }
  await ctx.close();
  if (!modelos.size) throw new Error('Localiza: nenhum modelo retornado');
  if (total && modelos.size < total) console.warn(`Localiza: o site informa ${total} registros, vieram ${modelos.size}`);
  const ant = new Map(lerAnterior(path.join(SAIDA, 'catalogo-localiza.js')).map(v => [String(v.fichaUrl).split('/').pop(), v]));
  return [...modelos.values()].map(m => paraVeiculoLoc(m, ant.get(m.slug), hoje));
}

/* ---------------- gravacao + diff ---------------- */
function gravar(locadora, arquivo, veiculos, hoje, prefixo, nota) {
  const limpos = veiculos.map(({ _id, ...v }) => v);
  const id = `${prefixo}-${hoje}`;
  const cab = `/* Gerado automaticamente por tools/coletar_catalogos.mjs em ${dataBR(hoje)}. ${nota} */\n`;
  fs.writeFileSync(arquivo, cab + `(window.CATALOGOS_INICIAIS = window.CATALOGOS_INICIAIS || []).push(${JSON.stringify({ id, veiculos: limpos })});\n`, 'utf8');
}
const semFonte = ({ fonte, ...v }) => v;
function diff(antes, depois, chave, preco) {
  const a = new Map(antes.map(v => [chave(v), v])), d = new Map(depois.map(v => [chave(v), v]));
  const nome = v => [v.marca, v.modelo, v.versao].filter(Boolean).join(' ');
  return {
    novos: [...d].filter(([k]) => !a.has(k)).map(([, v]) => nome(v)),
    removidos: [...a].filter(([k]) => !d.has(k)).map(([, v]) => nome(v)),
    preco: preco ? [...d].filter(([k, v]) => a.has(k) && preco(a.get(k)) !== preco(v)).map(([k, v]) => ({ veiculo: nome(v), de: preco(a.get(k)), para: preco(v) })) : []
  };
}

async function main() {
  const hoje = hojeBR();
  fs.mkdirSync(SAIDA, { recursive: true });
  const b = await navegador();
  const rel = { geradoEm: new Date().toISOString(), data: hoje, locadoras: {} };
  let falhou = false, houveMudanca = false;
  try {
    const alvos = [
      ['movida', 'catalogo-movida.js', () => coletarMovida(b, hoje), 'movida', 'Preco = "a partir de".', v => v.fichaUrl.split('/').pop(), v => v.planos?.[0]?.mensalidade ?? null],
      ['localiza', 'catalogo-localiza.js', () => coletarLocaliza(b, hoje), 'localiza', 'Dados da lista publica; sem precos.', v => v.fichaUrl.split('/').pop(), null]
    ].filter(a => !SO || a[0] === SO);
    for (const [nome, arq, coleta, prefixo, nota, chave, preco] of alvos) {
      const arquivo = path.join(SAIDA, arq);
      const antes = lerAnterior(arquivo);
      try {
        const novos = await coleta();
        if (antes.length && novos.length < antes.length * LIMITE_QUEDA) throw new Error(`so ${novos.length} veiculos contra ${antes.length} antes (< ${LIMITE_QUEDA * 100}%): nao gravei nada`);
        const depoisSemId = novos.map(({ _id, ...v }) => v);
        const mudancas = diff(antes, depoisSemId, chave, preco);
        const igual = JSON.stringify(antes.map(semFonte)) === JSON.stringify(depoisSemId.map(semFonte));
        rel.locadoras[nome] = { total: novos.length, antes: antes.length, semMudancas: igual, ...mudancas };
        if (!igual) { gravar(nome, arquivo, novos, hoje, prefixo, nota); houveMudanca = true; }
        console.log(`${nome}: ${novos.length} veiculos (antes ${antes.length}) | ${igual ? 'sem mudancas, arquivo mantido' : 'GRAVADO'} | novos ${mudancas.novos.length} | removidos ${mudancas.removidos.length} | precos alterados ${mudancas.preco.length}`);
      } catch (e) { falhou = true; rel.locadoras[nome] = { erro: e.message }; console.error(`${nome}: FALHOU - ${e.message}`); }
    }
  } finally { await b.close(); }
  if (houveMudanca) fs.writeFileSync(path.join(SAIDA, 'catalogo-mudancas.json'), JSON.stringify(rel, null, 2), 'utf8');   // so muda quando algo mudou: evita commit/deploy diario inutil
  process.exit(falhou ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
