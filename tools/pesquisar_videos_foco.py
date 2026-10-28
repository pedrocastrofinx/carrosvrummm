#!/usr/bin/env python3
"""Pesquisa retomavel de videos de INTERIOR e de EXTERIOR por modelo (marca + modelo), no YouTube Data API v3.
Reaproveita api/consulta/carregar/salvar de pesquisar_videos.py (mesmo cache, mesma regra: 403/429 interrompe e nada vira "concluido" com erro).
Progresso e candidatos ficam em arquivos proprios: data/progresso-foco.json e data/candidatos-foco.json.
Requer YOUTUBE_API_KEY no ambiente. Uso: python tools/pesquisar_videos_foco.py [--foco interior|exterior|ambos] [--limite N]
"""
import argparse, importlib.util, json, pathlib, time, urllib.error

AQUI = pathlib.Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("pv", AQUI / "pesquisar_videos.py")
pv = importlib.util.module_from_spec(spec); spec.loader.exec_module(pv)

PROGRESSO = pv.DATA / "progresso-foco.json"
CANDIDATOS = pv.DATA / "candidatos-foco.json"
SUFIXO = {"interior": "interior por dentro painel", "exterior": "exterior visual design por fora"}

def modelos(veiculos):
    """um item por marca+modelo, com o ano mais novo conhecido (ajuda a evitar geracoes antigas)"""
    out = {}
    for v in veiculos:
        k = (v.get("marca") or "", v.get("modelo") or "")
        if not k[0] or not k[1]: continue
        d = out.setdefault(k, {"marca": k[0], "modelo": k[1], "ano": ""})
        if str(v.get("ano") or "") > d["ano"]: d["ano"] = str(v.get("ano") or "")
    return list(out.values())

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--foco", choices=["interior", "exterior", "ambos"], default="ambos")
    ap.add_argument("--limite", type=int, default=0, help="maximo de buscas novas nesta execucao; 0 = todas")
    args = ap.parse_args()
    if not pv.KEY:
        raise SystemExit("ERRO: defina YOUTUBE_API_KEY como variavel de ambiente.")
    veiculos = pv.carregar(pv.VEICULOS, {}).get("veiculos", [])
    cache = pv.carregar(pv.CACHE, {})
    prog = pv.carregar(PROGRESSO, {"processados": [], "erros": [], "iniciadoEm": pv.agora()})
    cand = pv.carregar(CANDIDATOS, {"geradoEm": pv.agora(), "modelos": {}})
    feitos = set(prog.get("processados", []))
    focos = ["interior", "exterior"] if args.foco == "ambos" else [args.foco]
    n = 0
    for foco in focos:
        for m in modelos(veiculos):
            chave = f'{foco}|{m["marca"]}|{m["modelo"]}'
            if chave in feitos: continue
            if args.limite and n >= args.limite: break
            termo = " ".join(x for x in [m["marca"], m["modelo"], m["ano"], SUFIXO[foco]] if x)
            erros, achados, parar = [], [], False
            try:
                achados = pv.consulta(termo, cache)
            except urllib.error.HTTPError as e:
                erros.append({"termo": termo, "erro": f"HTTP {e.code}: {e.reason}"})
                parar = e.code in (403, 429)
            except Exception as e:
                erros.append({"termo": termo, "erro": str(e)})
            cand["modelos"][chave] = {"foco": foco, "marca": m["marca"], "modelo": m["modelo"], "ano": m["ano"], "termo": termo,
                                      "candidatos": achados, "erros": erros, "pesquisadoEm": pv.agora(), "status": "PENDENTE_REVISAO_HUMANA"}
            if erros: prog.setdefault("erros", []).append({"chave": chave, "erros": erros, "em": pv.agora()})
            else: prog["processados"].append(chave)
            prog["atualizadoEm"] = pv.agora()
            pv.salvar(CANDIDATOS, cand); pv.salvar(PROGRESSO, prog)
            n += 1
            if parar:
                print("Cota/permissao da API atingida; execucao pausada para preservar a retomada.")
                print(json.dumps({"buscasNestaExecucao": n, "totalProcessados": len(prog["processados"]), "erros": len(prog.get("erros", []))}, ensure_ascii=False))
                return
            time.sleep(0.15)
    total = len(modelos(veiculos)) * len(focos)
    print(json.dumps({"buscasNestaExecucao": n, "totalProcessados": len(prog["processados"]), "totalPrevisto": total, "erros": len(prog.get("erros", []))}, ensure_ascii=False, indent=2))

if __name__ == "__main__": main()
