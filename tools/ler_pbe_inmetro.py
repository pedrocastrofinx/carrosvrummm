#!/usr/bin/env python3
"""Le a tabela oficial PBE Veicular (Inmetro) em PDF e grava data/fichas-inmetro.json (marca, modelo, versao, motor, consumo).
Fonte: https://www.gov.br/inmetro/pt-br/assuntos/regulamentacao/avaliacao-da-conformidade/programa-brasileiro-de-etiquetagem/tabelas-de-eficiencia-energetica/veiculos-automotivos-pbe-veicular
Requer: pip install pymupdf   |   Uso: python tools/ler_pbe_inmetro.py caminho/da/tabela.pdf
Cada linha so e aceita se passar nas checagens de consistencia (faixas plausiveis; etanol <= gasolina). Linha duvidosa e descartada, nunca "corrigida".
"""
import json, pathlib, re, sys, unicodedata
from datetime import datetime, timezone

DATA = pathlib.Path(__file__).resolve().parents[1] / "data"
TIPOS = {"COMBUSTAO": "Combustão", "HIBRIDO": "Híbrido", "ELETRICO": "Elétrico"}
MARCAS = {"FIAT", "CHEVROLET", "VOLKSWAGEN", "VW", "TOYOTA", "HONDA", "HYUNDAI", "RENAULT", "JEEP", "NISSAN", "BYD", "PEUGEOT", "CITROEN", "RAM", "FORD", "MITSUBISHI",
          "GWM", "CAOA CHERY", "BMW", "AUDI", "VOLVO", "GEELY", "GAC", "DENZA", "MERCEDES-BENZ", "KIA", "SUZUKI", "JAC", "LEXUS", "LAND ROVER", "PORSCHE", "MINI"}
COMBUSTIVEL = {"F": "Flex", "G": "Gasolina", "D": "Diesel", "E": "Elétrico", "H": "Híbrido"}

def norm(s): return unicodedata.normalize("NFD", str(s or "")).encode("ascii", "ignore").decode().upper().strip()
def numero(t):
    t = t.strip()
    return float(t.replace(",", ".")) if re.fullmatch(r"\d{1,3},\d{1,2}", t) else None

def tokens(pdf):
    import pymupdf
    out = []
    for p in pymupdf.open(pdf):
        out += [l.strip() for l in p.get_text("text").split("\n") if l.strip()]
    return out

def parse(tok):
    linhas, descartadas = [], []
    for k, t in enumerate(tok):
        if norm(t) not in TIPOS or k < 4 or k + 19 >= len(tok): continue
        # motor = token anterior; marca = ultimo token conhecido nas posicoes anteriores (ate 6 atras)
        motor = tok[k - 1]
        ib = next((j for j in range(k - 2, max(k - 8, 0), -1) if norm(tok[j]) in MARCAS), None)
        if ib is None: descartadas.append({"motivo": "marca nao reconhecida", "trecho": " | ".join(tok[max(k - 6, 0):k + 1])}); continue
        desc = tok[ib + 1:k - 1]
        if not desc: descartadas.append({"motivo": "sem modelo", "trecho": " | ".join(tok[max(k - 6, 0):k + 1])}); continue
        pos = tok[k + 1:k + 24]
        trans, comb = pos[0], pos[3]
        etanol, gasolina = [numero(x) for x in pos[12:15]], [numero(x) for x in pos[15:18]]
        tipo = TIPOS[norm(t)]
        r = {"marca": tok[ib].strip(), "modelo": desc[0].strip(), "versao": " ".join(x.strip() for x in desc[1:]), "motor": motor.strip(), "tipo": tipo,
             "transmissao": trans, "combustivel": COMBUSTIVEL.get(comb, comb)}
        if tipo != "Elétrico":
            ok = True
            for tr in (etanol, gasolina):
                if any(x is not None for x in tr) and not (all(x is not None for x in tr) and all(2.0 <= x <= 40.0 for x in tr)): ok = False
            if comb == "F" and (None in gasolina or None in etanol): ok = False
            if comb == "G" and None in gasolina: ok = False
            if None not in etanol and None not in gasolina and etanol[0] > gasolina[0] + 0.05: ok = False
            if not ok: descartadas.append({"motivo": "consumo fora da checagem", "marca": tok[ib].strip(), "modelo": desc[0].strip(), "versao": " ".join(desc[1:]), "etanol": etanol, "gasolina": gasolina}); continue
            r["consumo"] = {"etanol": dict(zip(("cidade", "estrada", "combinado"), etanol)) if None not in etanol else None,
                            "gasolina": dict(zip(("cidade", "estrada", "combinado"), gasolina)) if None not in gasolina else None}
        linhas.append(r)
    return linhas, descartadas

def main():
    if len(sys.argv) < 2: raise SystemExit(__doc__)
    linhas, desc = parse(tokens(sys.argv[1]))
    corpo = {"fonte": "Inmetro - PBE Veicular 2026 (18o ciclo)", "url": "https://www.gov.br/inmetro/pt-br/assuntos/regulamentacao/avaliacao-da-conformidade/programa-brasileiro-de-etiquetagem/tabelas-de-eficiencia-energetica/veiculos-automotivos-pbe-veicular",
             "lidoEm": datetime.now(timezone.utc).isoformat(timespec="seconds"), "linhas": linhas, "linhasDescartadas": len(desc), "descartadas": desc}
    (DATA / "fichas-inmetro.json").write_text(json.dumps(corpo, ensure_ascii=False, indent=1), encoding="utf-8", newline="\n")
    por_marca = {}
    for l in linhas: por_marca[l["marca"]] = por_marca.get(l["marca"], 0) + 1
    print(json.dumps({"linhasLidas": len(linhas), "descartadas": len(desc), "porMarca": por_marca}, ensure_ascii=True))

if __name__ == "__main__": main()
