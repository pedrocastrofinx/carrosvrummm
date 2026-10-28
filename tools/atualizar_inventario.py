#!/usr/bin/env python3
"""Acrescenta a data/veiculos-pesquisa.json (inventario da pesquisa de videos) os veiculos NOVOS dos catalogos atuais.
- Casa pela URL da ficha; se a ficha e nova mas marca+modelo+versao+ano ja existem, so anexa a oferta ao veiculo existente.
- Nunca altera ids existentes e nunca remove veiculos (um carro que saiu do catalogo continua com seus videos).
Uso: python tools/atualizar_inventario.py
"""
import json, pathlib
from datetime import datetime, timedelta, timezone

DATA = pathlib.Path(__file__).resolve().parents[1] / "data"
INVENTARIO = DATA / "veiculos-pesquisa.json"
PENDENCIAS_PADRAO = ["ano", "motor", "potencia", "torque", "cambio", "combustivel", "consumo", "autonomia", "bateria", "portas", "lugares", "portaMalas", "dimensoes", "equipamento", "conforto", "conectividade", "seguranca", "fabricanteFonte"]
TECNICOS = {"ano": "ano", "cambio": "cambio", "combustivel": "combustivel", "lugares": "lugares", "conforto": "conforto", "conectividade": "conectividade"}

def ler_catalogo(nome):
    p = DATA / nome
    if not p.exists(): return []
    t = p.read_text(encoding="utf-8-sig")
    return json.loads(t[t.index("push(") + 5: t.rindex(")")]).get("veiculos", [])

def chave(v): return tuple(str(v.get(k) or "").strip().lower() for k in ("marca", "modelo", "versao", "ano"))

def main():
    inv = json.loads(INVENTARIO.read_text(encoding="utf-8-sig"))
    veic = inv["veiculos"]
    por_ficha = {o["fichaUrl"] for v in veic for o in v.get("ofertas", [])}
    por_chave = {chave(v): v for v in veic}
    prox = max((int(v["id"].split("-")[1]) for v in veic), default=0) + 1
    novos, anexadas, ofertas_total = [], 0, 0
    for arq in ("catalogo-localiza.js", "catalogo-movida.js"):
        for c in ler_catalogo(arq):
            ofertas_total += 1
            if c.get("fichaUrl") in por_ficha: continue
            oferta = {"locadora": c.get("locadora", ""), "fichaUrl": c.get("fichaUrl", "")}
            existente = por_chave.get(chave(c))
            if existente:
                existente["ofertas"].append(oferta)
                if oferta["locadora"] and oferta["locadora"] not in existente["locadoras"]: existente["locadoras"].append(oferta["locadora"])
                anexadas += 1
            else:
                tec = {k: c[o] for k, o in TECNICOS.items() if k != "ano" and c.get(o) not in (None, "", [])}
                v = {"id": f"veh-{prox:03d}", "marca": c["marca"], "modelo": c["modelo"], "versao": c.get("versao") or "", "ano": str(c.get("ano") or ""),
                     "locadoras": [oferta["locadora"]] if oferta["locadora"] else [], "ofertas": [oferta], "dadosTecnicosExistentes": tec,
                     "pendenciasTecnicas": [p for p in PENDENCIAS_PADRAO if p not in tec and not (p == "ano" and c.get("ano"))], "statusPesquisa": "pendente"}
                prox += 1; veic.append(v); novos.append(v); por_chave[chave(v)] = v
            por_ficha.add(oferta["fichaUrl"])
    if novos or anexadas:
        inv["totalVeiculosUnicos"] = len(veic)
        inv["totalOfertas"] = sum(len(v.get("ofertas", [])) for v in veic)
        inv["atualizadoEm"] = datetime.now(timezone(timedelta(hours=-3))).isoformat(timespec="seconds")
        tmp = INVENTARIO.with_suffix(".json.tmp")
        tmp.write_text(json.dumps(inv, ensure_ascii=False, indent=2), encoding="utf-8", newline="\n"); tmp.replace(INVENTARIO)
    print(json.dumps({"ofertasNosCatalogos": ofertas_total, "veiculosNovos": [f'{v["id"]} {v["marca"]} {v["modelo"]} {v["versao"]}'.encode("ascii", "replace").decode() for v in novos], "ofertasAnexadas": anexadas, "totalNoInventario": len(veic)}, indent=2))

if __name__ == "__main__": main()
