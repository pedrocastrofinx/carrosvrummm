#!/usr/bin/env python3
"""Classifica os candidatos do YouTube (data/candidatos-youtube.json + data/candidatos-foco.json) e gera as SUGESTOES para o Hub.
- Pontua cada candidato por veiculo (modelo, ano, versao), descarta videos negativos/usados e separa em interior / exterior / avaliacao.
- NUNCA marca nada como validado: o que sai daqui entra no Hub como "sugerido-auto" e continua exigindo revisao humana.
Saidas: data/videos-sugeridos.json (auditoria, com descartados) e data/videos-sugeridos.js (importado pelo Hub).
Uso: python tools/classificar_videos.py
"""
import hashlib, json, pathlib, re, unicodedata
from datetime import datetime, timedelta, timezone

DATA = pathlib.Path(__file__).resolve().parents[1] / "data"
MIN_SUGERIR, MIN_ALTA = 55, 75
LIMITES = {"avaliacao": 3, "interior": 2, "exterior": 2}

def norm(s): return unicodedata.normalize("NFD", str(s or "")).encode("ascii", "ignore").decode().lower()
def toks(s): return re.findall(r"[a-z0-9]+(?:\.[0-9]+)?", norm(s))
def ler(nome, padrao):
    p = DATA / nome
    return json.loads(p.read_text(encoding="utf-8-sig")) if p.exists() else padrao

RX_INTERIOR = re.compile(r"\b(interior|interno|internamente|por dentro|painel|acabamento|multimidia|bancos?|porta[- ]?malas|espaco interno|cabine|habitaculo|volante)\b")
RX_EXTERIOR = re.compile(r"\b(exterior|externo|por fora|visual|design|estilo|fachada|lanternas?|rodas?|farois?|carroceria)\b")
RX_NEGATIVO = re.compile(r"\b(defeitos?|problemas?|reclamac\w+|cilada|nunca compre|arrepend\w+|quebr\w+|pifou|decepc\w+|nao compre|furada|desastre|fiasco|processo|recall)\b")
RX_USADO = re.compile(r"\b(usado|seminovo|semi-?novo|de segunda mao|revisao de)\b")
RX_COMPARA = re.compile(r"\b(vs|versus|comparativo|duelo|x)\b")
STOP_VERSAO = {"flex", "automatico", "automatica", "aut", "manual", "autom", "para", "com", "sem", "pack", "base"}

def ano_do_veiculo(v):
    m = re.search(r"20\d\d", str(v.get("ano") or "")); return int(m.group()) if m else None

def pontuar(v, c):
    """devolve (pontos, motivos) ou (None, motivo_descarte)"""
    titulo = norm(c.get("titulo")); desc = norm(c.get("descricao"))[:400]
    if c.get("statusPrivacidade") not in ("public", "desconhecido") or c.get("embeddable") is False: return None, "nao incorporavel/publico"
    if RX_NEGATIVO.search(titulo): return None, "conteudo negativo"
    if RX_USADO.search(titulo): return None, "usado/seminovo"
    mt = toks(v.get("modelo"))
    if not mt: return None, "sem modelo"
    if not re.search(r"(?<![a-z0-9])" + r"[\s\-]*".join(map(re.escape, mt)) + r"(?![a-z0-9])", titulo): return None, "modelo ausente no titulo"
    pts, mot = 50, ["modelo no titulo"]
    mb = toks(v.get("marca"))
    if mb and all(t in toks(titulo) for t in mb): pts += 10; mot.append("marca no titulo")
    y = ano_do_veiculo(v); anos = {int(a) for a in re.findall(r"\b(20\d\d)\b", titulo)}
    if y and anos:
        d = min(abs(y - a) for a in anos)
        if d == 0: pts += 20; mot.append(f"ano {y} no titulo")
        elif d == 1: pts += 5; mot.append("ano vizinho")
        else: pts -= 20; mot.append(f"ano diferente ({sorted(anos)[0]})")
    vt = [t for t in toks(v.get("versao")) if re.fullmatch(r"[a-z]{4,}", t) and t not in STOP_VERSAO and t not in mt]
    if vt:
        h = sum(1 for t in set(vt) if t in titulo); pts += round(15 * h / len(set(vt)))
        if h: mot.append(f"versao {h}/{len(set(vt))}")
    for cil in set(re.findall(r"\b\d\.\d\b", str(v.get("versao") or ""))):
        if cil in titulo: pts += 5; mot.append(f"motor {cil}")
    if RX_COMPARA.search(titulo): pts -= 10; mot.append("comparativo")
    return pts, mot

def categoria(c, foco=None):
    t = norm(c.get("titulo")); i, e = bool(RX_INTERIOR.search(t)), bool(RX_EXTERIOR.search(t))
    if i and not e: return "interior"
    if e and not i: return "exterior"
    return foco if (foco and i and e) else "avaliacao"

def main():
    veiculos = ler("veiculos-pesquisa.json", {}).get("veiculos", [])
    por_veic = ler("candidatos-youtube.json", {}).get("veiculos", {})
    por_modelo = ler("candidatos-foco.json", {}).get("modelos", {})
    foco_de = {}
    for ch, x in por_modelo.items():
        if not x.get("erros"): foco_de.setdefault((x["marca"], x["modelo"]), []).append(x)
    saida, descartes, total_c = {}, {}, 0
    for v in veiculos:
        fontes = [(c, None) for c in (por_veic.get(v["id"], {}) or {}).get("candidatos", [])]
        for x in foco_de.get((v.get("marca"), v.get("modelo")), []): fontes += [(c, x["foco"]) for c in x["candidatos"]]
        melhores = {}
        for c, foco in fontes:
            total_c += 1
            if not c.get("videoId"): continue
            pts, mot = pontuar(v, c)
            if pts is None: descartes[mot] = descartes.get(mot, 0) + 1; continue
            if pts < MIN_SUGERIR: descartes["pontuacao baixa"] = descartes.get("pontuacao baixa", 0) + 1; continue
            reg = {"videoId": c["videoId"], "url": c["url"], "titulo": c["titulo"], "canal": c.get("canal", ""), "publicadoEm": c.get("publicadoEm", ""),
                   "categoria": categoria(c, foco), "pontuacao": min(100, pts), "nivel": "alta" if pts >= MIN_ALTA else "media", "motivos": mot,
                   "statusValidacao": "SUGERIDO_AUTOMATICO_REVISAR"}
            if c["videoId"] not in melhores or melhores[c["videoId"]]["pontuacao"] < reg["pontuacao"]: melhores[c["videoId"]] = reg
        escolhidos, cont = [], {}
        recentes = sorted(melhores.values(), key=lambda r: r["publicadoEm"] or "", reverse=True)
        for r in sorted(recentes, key=lambda r: -r["pontuacao"]):
            if cont.get(r["categoria"], 0) < LIMITES[r["categoria"]]:
                cont[r["categoria"]] = cont.get(r["categoria"], 0) + 1; escolhidos.append(r)
        if escolhidos: saida[v["id"]] = escolhidos
    tem = sum(1 for v in veiculos if v["id"] in saida)
    corpo = {"criterios": {"minimoParaSugerir": MIN_SUGERIR, "nivelAlta": MIN_ALTA, "limitesPorVeiculo": LIMITES,
                           "aviso": "Sugestoes automaticas por titulo/ano/versao. NAO comprovam versao, ano, geracao, mercado brasileiro nem conteudo visual; exigem revisao humana."},
             "resumo": {"veiculos": len(veiculos), "comSugestao": tem, "semSugestao": len(veiculos) - tem, "candidatosAvaliados": total_c, "videosSugeridos": sum(len(x) for x in saida.values()), "descartes": descartes},
             "veiculos": saida}
    h = hashlib.sha1(json.dumps(saida, sort_keys=True, ensure_ascii=False).encode()).hexdigest()[:8]
    hoje = datetime.now(timezone(timedelta(hours=-3))).strftime("%Y-%m-%d")
    corpo["id"] = f"videos-sugeridos-{hoje}-{h}"
    (DATA / "videos-sugeridos.json").write_text(json.dumps(corpo, ensure_ascii=False, indent=2), encoding="utf-8", newline="\n")
    itens = []
    for v in veiculos:
        for r_loc in v.get("locadoras") or [""]:
            vids = [{"url": r["url"], "titulo": r["titulo"], "categoria": r["categoria"], "tags": ["sugerido-auto", "confianca-" + r["nivel"]],
                     "descricao": f"Sugerido automaticamente ({r['nivel']}, {r['pontuacao']}/100) - canal {r['canal']}. Confirmar versao e ano antes de enviar ao cliente."}
                    for r in saida.get(v["id"], [])]
            if vids: itens.append({"marca": v["marca"], "modelo": v["modelo"], "versao": v.get("versao") or "", "locadora": r_loc, "videos": vids})
    js = ("/* Gerado por tools/classificar_videos.py. Videos SUGERIDOS (nao validados): importados com a tag sugerido-auto. */\n"
          "(window.CATALOGOS_INICIAIS = window.CATALOGOS_INICIAIS || []).push(" + json.dumps({"id": corpo["id"], "veiculos": itens}, ensure_ascii=False) + ");\n")
    (DATA / "videos-sugeridos.js").write_text(js, encoding="utf-8", newline="\n")
    print(json.dumps(corpo["resumo"], ensure_ascii=True, indent=2))
    print("id do lote:", corpo["id"])

if __name__ == "__main__": main()
