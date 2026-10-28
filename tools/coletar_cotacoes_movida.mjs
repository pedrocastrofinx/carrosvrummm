// Coleta as COTACOES PUBLICAS da Movida (prazo x km por carro) exatamente como o configurador do site faz:
//   GET  /api/v1/pricing/<id>  -> planos disponiveis (meses x km) e protecoes
//   POST /api/v1/pricing/<id>  -> valor mensal de cada plano
// Abre a pagina do carro num navegador real (o site entrega o token sozinho). Retomavel: pula carros ja coletados.
// Uso: node tools/coletar_cotacoes_movida.mjs [--saida pasta] [--limite N]
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const SAIDA = path.resolve(opt('saida', path.join(RAIZ, 'data'))), LIMITE = Number(opt('limite', 0));
const JSON_PARCIAL = path.join(SAIDA, 'cotacoes-movida.json');
const dorme = ms => new Promise(r => setTimeout(r, ms));

function ids() {
  const t = fs.readFileSync(path.join(SAIDA, 'catalogo-movida.js'), 'utf8');
  const v = JSON.parse(t.slice(t.indexOf('push(') + 5, t.lastIndexOf(')'))).veiculos;
  return [...new Set(v.map(x => String(x.fichaUrl).split('/').pop()))];
}

const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const b = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH || fs.existsSync(edge) ? { executablePath: process.env.CHROME_PATH || edge } : {}) });
const page = await (await b.newContext({ locale: 'pt-BR' })).newPage();
const lista = ids();
const feito = fs.existsSync(JSON_PARCIAL) ? JSON.parse(fs.readFileSync(JSON_PARCIAL, 'utf8')) : { veiculos: {} };
const pend = lista.filter(i => !feito.veiculos[i]).slice(0, LIMITE || undefined);
console.log(`${lista.length} carros | ${pend.length} a coletar`);
if (!pend.length) { gerarJs(feito); await b.close(); process.exit(0); }

await page.goto(`https://www.movidacarroporassinatura.com.br/assinatura/detalhes/x/${lista[0]}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await dorme(8000);

async function cotar(id) {
  return page.evaluate(async ({ id }) => {
    const B = 'https://be-zkm.movidacloud.com.br', tk = localStorage.getItem('AccessToken');
    const H = { accesstoken: tk, channel: '26', accept: 'application/json, text/plain, */*' };
    const z = ms => new Promise(r => setTimeout(r, ms));
    const g = await (await fetch(`${B}/api/v1/pricing/${id}`, { headers: H })).json();
    if (!g.data || !g.data.plans) return { erro: 'sem planos' };
    const prot = (g.data.protections || [])[0], planos = [];
    for (const pl of g.data.plans) {
      await z(110);
      const r = await fetch(`${B}/api/v1/pricing/${id}`, { method: 'POST', headers: { ...H, 'content-type': 'application/json' },
        body: JSON.stringify({ modelId: id, code: null, period: pl.month, km: pl.franchise, accessories: prot ? [prot.id] : [], advanceInstallment: 3, paymentId: null, used: false, paintingType: null, coupon: null }) });
      const j = await r.json(), m = (j.data || []).find(x => !x.isAdvance) || (j.data || [])[0];
      if (m) planos.push([pl.month, pl.franchise, m.priceInstallmentValue, m.priceRateDistanceValue]);
    }
    return { nome: g.data.vehicle && g.data.vehicle.description, aPartirDe: g.data.prices && g.data.prices.priceStartingValue, protecao: prot ? prot.name.trim() : '', planos };
  }, { id });
}

let n = 0, falhas = 0;
for (const id of pend) {
  try {
    const r = await cotar(id);
    if (r.erro || !r.planos.length) throw new Error(r.erro || 'nenhum plano');
    feito.veiculos[id] = r; n++;
  } catch (e) { falhas++; console.log('falhou', id, e.message); await dorme(2000); }
  if ((n + falhas) % 5 === 0) { fs.writeFileSync(JSON_PARCIAL, JSON.stringify(feito)); console.log(`${n + falhas}/${pend.length} (falhas ${falhas})`); }
  await dorme(250);
}
fs.writeFileSync(JSON_PARCIAL, JSON.stringify(feito));
gerarJs(feito); await b.close();
console.log(`concluido: ${n} coletados, ${falhas} falhas`);

function gerarJs(d) {
  const hoje = new Date().toISOString().slice(0, 10);
  const corpo = { geradoEm: hoje, fonte: 'Site da Movida (configurador de planos)', veiculos: d.veiculos };
  fs.writeFileSync(path.join(SAIDA, 'cotacoes-movida.js'), `/* Cotacoes publicas da Movida por prazo x km, coletadas de movidacarroporassinatura.com.br em ${hoje}. planos = [meses, km/mes, mensalidade, R$ por km excedente]. */\nwindow.COTACOES_MOVIDA = ${JSON.stringify(corpo)};\n`, 'utf8');
}
