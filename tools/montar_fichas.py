#!/usr/bin/env python3
"""Casa os veiculos do inventario (data/veiculos-pesquisa.json) com fontes tecnicas OFICIAIS e gera as fichas para o Hub.
Fontes: data/fichas-inmetro.json (PBE Veicular - motor e consumo) e data/fichas-fabricantes.json (potencia, torque, porta-malas, com URL da ficha oficial).
Regra de ouro: so preenche campo quando o casamento e inequivoco; cada campo carrega a fonte; o que nao casa fica "Nao informado". Nada e estimado.
Saidas: data/fichas-tecnicas.json (auditoria) e data/fichas-tecnicas.js (importado pelo Hub). Uso: python tools/montar_fichas.py
"""
import hashlib, json, pathlib, re, unicodedata
from datetime import datetime, timedelta, timezone

DATA = pathlib.Path(__file__).resolve().parents[1] / "data"

def norm(s): return unicodedata.normalize("NFD", str(s or "")).encode("ascii", "ignore").decode().lower().strip()
def compacto(s): return re.sub(r"[^a-z0-9]", "", norm(s))
def toks(s): return re.findall(r"[a-z0-9]+(?:\.[0-9]+)?", norm(s))
def ler(nome, padrao):
    p = DATA / nome
    return json.loads(p.read_text(encoding="utf-8-sig")) if p.exists() else padrao

MARCA_ALIAS = {"vw": "volkswagen", "gmchevrolet": "chevrolet", "chery": "caoachery"}
def marca_chave(m):
    c = compacto(m); return MARCA_ALIAS.get(c, c)
def modelo_chave(m): return compacto(re.sub(r"\(.*?\)", "", str(m or "")))

STOP = {"flex", "aut", "autom", "automatico", "automatica", "manual", "turbo", "com", "sem", "pack", "base", "plus", "4x2", "4x4", "cd", "cs", "ce", "cp", "pol", "multimidia", "mec", "dct", "cvt", "at", "mt", "tb", "gdi", "tgdi", "tce", "mpi", "nova", "novo"}
def cilindrada(txt):
    m = re.search(r"(?<!\d)(\d)[.,](\d)(?!\d)", str(txt or "")); return f"{m.group(1)}.{m.group(2)}" if m else None
def eh_turbo_nosso(v): return bool(re.search(r"\b(turbo|tsi|tb|tce|t\d{3}|bluehdi|t-?gdi|gdi)\b", norm(v)))
def eh_turbo_pbe(r): return bool(re.search(r"\d\s*t\s*-|\d\s*t\b|\dv\s*t\b|turbo|tsi\b|tgdi|t-gdi", norm(r["motor"] + " " + r["versao"])))
def trans_nossa(v):
    n = norm(v)
    if re.search(r"\b(aut|autom|automatico|automatica|cvt|dct|at|tiptronic)\b", n): return "A"
    if re.search(r"\b(manual|mt|mec)\b", n): return "M"
    return None
def trans_pbe(t):
    t = norm(t)
    if t.startswith("m"): return "M"
    return "A" if t else None

def pontuar(v, r):
    """None = incompativel; senao (pontos, sinais)"""
    sinais, pts = [], 0
    cn, cp = cilindrada(v.get("versao")), cilindrada(r["motor"])
    if r["tipo"] == "Elétrico" or (cn is None and cp is None):
        pass
    elif cn and cp and cn != cp: return None
    elif cn and cp: pts += 3; sinais.append("cilindrada")
    tn, tp = trans_nossa(v.get("versao")), trans_pbe(r["transmissao"])
    if tn and tp and tn != tp: return None
    if tn and tp: pts += 2; sinais.append("cambio")
    fn = norm(v.get("versao")); dn = "diesel" in fn
    if dn and r["combustivel"] != "Diesel": return None
    if not dn and r["combustivel"] == "Diesel" and "diesel" not in norm(v.get("versao")): pts -= 1
    if eh_turbo_nosso(v.get("versao")) == eh_turbo_pbe(r): pts += 1; sinais.append("turbo")   # turbo nosso sem marca no PBE nao exclui (Kicks 1.0 turbo aparece como "1.0 12V")
    a = {t for t in toks(v.get("versao")) if len(t) >= 2 and t not in STOP and not re.fullmatch(r"[\d.]+v?", t)}
    b = {t for t in toks(r["versao"]) if len(t) >= 2 and t not in STOP and not re.fullmatch(r"[\d.]+v?", t)}
    comum = a & b
    if comum: pts += 3 * len(comum); sinais.append("versao:" + "/".join(sorted(comum)))
    return pts, sinais

def consumo_texto(r):
    c = r.get("consumo") or {}; partes = []
    fmt = lambda g: f"cidade {str(g['cidade']).replace('.', ',')} / estrada {str(g['estrada']).replace('.', ',')} km/l"
    if c.get("etanol"): partes.append("Etanol: " + fmt(c["etanol"]))
    if c.get("gasolina"): partes.append(("Diesel: " if r["combustivel"] == "Diesel" else "Gasolina: ") + fmt(c["gasolina"]))
    return " · ".join(partes)

def motor_texto(r):
    if r["tipo"] == "Elétrico": return "Elétrico"
    m = re.match(r"\s*(\d)[.,](\d)\s*(T?)\s*[-–]?\s*(\d+)?\s*V?", r["motor"].upper())
    if not m: return r["motor"].title() + (" (híbrido)" if r["tipo"] == "Híbrido" else "")
    s = f"{m.group(1)}.{m.group(2)}" + (" Turbo" if m.group(3) or eh_turbo_pbe(r) else "") + (f" {m.group(4)}V" if m.group(4) else "")
    return s + (" híbrido" if r["tipo"] == "Híbrido" else "") + f" · {r['combustivel']}"

def casar(v, pbe):
    mesma_marca = [r for r in pbe if marca_chave(r["marca"]) == marca_chave(v["marca"])]
    cand = [r for r in mesma_marca if modelo_chave(r["modelo"]) == modelo_chave(v["modelo"])]
    if not cand:   # nome do PBE traz palavras a mais ("HILUX DIESEL 4X4 AT", "Q3 SUV"): aceita se todas as palavras do nosso modelo estao la
        nossos = set(toks(re.sub(r"\(.*?\)", "", str(v["modelo"]))))
        cand = [r for r in mesma_marca if nossos and nossos <= set(toks(re.sub(r"\(.*?\)", "", r["modelo"])))]
    if not cand: return None, "modelo ausente no PBE"
    pont = [(pontuar(v, r), r) for r in cand]; pont = [(p, r) for p, r in pont if p is not None]
    if not pont: return None, "nenhuma linha compativel (cilindrada/cambio/turbo)"
    pont.sort(key=lambda x: -x[0][0]); topo = pont[0][0][0]
    melhores = [(p, r) for p, r in pont if p[0] == topo]
    textos = {(motor_texto(r), consumo_texto(r)) for _, r in melhores}
    (p, r) = melhores[0]
    if len({a for a, _ in textos}) == 1 and len(textos) > 1 and "cilindrada" in p[1]:   # empate com o MESMO motor: preenche so o motor, nunca o consumo
        return {"linha": r, "confianca": "so-motor", "sinais": p[1], "empatadas": len(melhores)}, None
    if len(textos) > 1: return None, "ambiguo (linhas empatadas com consumo diferente)"
    tem_versao = any(s.startswith("versao:") for s in p[1])
    if "cilindrada" not in p[1] and r["tipo"] != "Elétrico": return None, "sem cilindrada para confirmar"
    return {"linha": r, "confianca": "alta" if tem_versao else "media", "sinais": p[1], "empatadas": len(melhores)}, None

def main():
    inv = ler("veiculos-pesquisa.json", {}).get("veiculos", [])
    pbe = ler("fichas-inmetro.json", {}).get("linhas", [])
    fab = ler("fichas-fabricantes.json", {}).get("fichas", [])
    saida, motivos = {}, {}
    for v in inv:
        ficha, motivo = casar(v, pbe)
        campos, fontes = {}, {}
        if ficha:
            r = ficha["linha"]
            campos["motor"], fontes["motor"] = motor_texto(r), "Inmetro PBE Veicular 2026"
            c = consumo_texto(r) if ficha["confianca"] != "so-motor" else ""
            if c: campos["consumo"], fontes["consumo"] = c + " (Inmetro PBE)", "Inmetro PBE Veicular 2026"
        else: motivos[motivo] = motivos.get(motivo, 0) + 1
        # fichas oficiais de fabricante: casam por marca+modelo+cilindrada (+ turbo/cambio quando informados)
        for f in fab:
            if marca_chave(f["marca"]) != marca_chave(v["marca"]) or modelo_chave(f["modelo"]) != modelo_chave(v["modelo"]): continue
            if f.get("cilindrada") and f["cilindrada"] != cilindrada(v.get("versao")): continue
            if f.get("versaoContem") and not all(norm(x) in norm(v.get("versao")) for x in f["versaoContem"]): continue   # ex.: ["mhev"] para a motorizacao hibrida leve
            if f.get("versaoNaoContem") and any(norm(x) in norm(v.get("versao")) for x in f["versaoNaoContem"]): continue
            if f.get("turbo") is not None and f["turbo"] != eh_turbo_nosso(v.get("versao")): continue
            if f.get("anoMin") and v.get("ano") and str(v["ano"]) < str(f["anoMin"]): continue
            for k in ("potencia", "torque", "portaMalas"):
                if f.get(k) and k not in campos: campos[k], fontes[k] = f[k], f["fonteUrl"] + (f" ({f['fonteTipo']})" if f.get("fonteTipo") and f["fonteTipo"] != "fabricante" else "")
        if campos:
            saida[v["id"]] = {"campos": campos, "fontes": fontes, "confiancaPBE": ficha["confianca"] if ficha else None,
                              "linhaPBE": (f'{ficha["linha"]["marca"]} {ficha["linha"]["modelo"]} {ficha["linha"]["versao"]} {ficha["linha"]["motor"]} {ficha["linha"]["transmissao"]}'.strip() if ficha else None)}
    cont = lambda k: sum(1 for x in saida.values() if k in x["campos"])
    resumo = {"veiculos": len(inv), "comAlgumDado": len(saida), "motor": cont("motor"), "consumo": cont("consumo"), "potencia": cont("potencia"), "torque": cont("torque"), "portaMalas": cont("portaMalas"),
              "confiancaAltaPBE": sum(1 for x in saida.values() if x["confiancaPBE"] == "alta"), "confiancaMediaPBE": sum(1 for x in saida.values() if x["confiancaPBE"] == "media"), "soMotor": sum(1 for x in saida.values() if x["confiancaPBE"] == "so-motor"), "naoCasados": motivos}
    h = hashlib.sha1(json.dumps(saida, sort_keys=True, ensure_ascii=False).encode()).hexdigest()[:8]
    hoje = datetime.now(timezone(timedelta(hours=-3))).strftime("%Y-%m-%d"); idl = f"fichas-tecnicas-{hoje}-{h}"
    (DATA / "fichas-tecnicas.json").write_text(json.dumps({"id": idl, "resumo": resumo, "veiculos": saida}, ensure_ascii=False, indent=1), encoding="utf-8", newline="\n")
    itens = []
    for v in inv:
        s = saida.get(v["id"])
        if not s: continue
        fonte = "; ".join(sorted({f"{k}: {u}" for k, u in s["fontes"].items()}))
        for loc in v.get("locadoras") or [""]:
            itens.append({"marca": v["marca"], "modelo": v["modelo"], "versao": v.get("versao") or "", "locadora": loc, **s["campos"],
                          "fabricanteFonte": f"{fonte} | casamento PBE: {s['linhaPBE']} ({s['confiancaPBE']})" if s["linhaPBE"] else fonte})
    js = ("/* Gerado por tools/montar_fichas.py. Motor/consumo: Inmetro PBE Veicular. Demais campos: fichas oficiais de fabricante, cada um com URL. */\n"
          "(window.CATALOGOS_INICIAIS = window.CATALOGOS_INICIAIS || []).push(" + json.dumps({"id": idl, "veiculos": itens}, ensure_ascii=False) + ");\n")
    (DATA / "fichas-tecnicas.js").write_text(js, encoding="utf-8", newline="\n")
    print(json.dumps(resumo, ensure_ascii=True, indent=1))

if __name__ == "__main__": main()
