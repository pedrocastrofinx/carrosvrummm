#!/usr/bin/env python3
"""Pesquisa retomável de candidatos no YouTube Data API v3.
Nunca marca vídeos como validados automaticamente. Requer YOUTUBE_API_KEY no ambiente.
Uso: python tools/pesquisar_videos.py [--limite N]
"""
import argparse, json, os, pathlib, time, urllib.parse, urllib.request, urllib.error
from datetime import datetime, timezone

ROOT = pathlib.Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
VEICULOS = DATA / "veiculos-pesquisa.json"
CACHE = DATA / "youtube-cache.json"
PROGRESSO = DATA / "progresso-pesquisa.json"
CANDIDATOS = DATA / "candidatos-youtube.json"
KEY = os.environ.get("YOUTUBE_API_KEY", "").strip()

def agora():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")

def carregar(path, fallback):
    if not path.exists(): return fallback
    try: return json.loads(path.read_text(encoding="utf-8-sig"))
    except Exception as e:
        # nunca devolve o padrao em cima de arquivo existente: o proximo salvar() apagaria o progresso
        raise SystemExit(f"ERRO: nao consegui ler {path.name} ({e}). Nada foi alterado.")

def salvar(path, obj):
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(path)

def api(endpoint, params):
    params = dict(params, key=KEY)
    url = "https://www.googleapis.com/youtube/v3/" + endpoint + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": "DryveHubResearch/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))

def consulta(termo, cache):
    if termo in cache: return cache[termo]
    data = api("search", {"part":"snippet", "type":"video", "maxResults":5, "q":termo, "regionCode":"BR", "relevanceLanguage":"pt"})
    ids = [x.get("id",{}).get("videoId") for x in data.get("items",[])]
    ids = [x for x in ids if x]
    detalhes = {}
    if ids:
        vdata = api("videos", {"part":"snippet,contentDetails,status", "id":",".join(ids), "maxResults":50})
        detalhes = {x["id"]:x for x in vdata.get("items",[])}
    out=[]
    for item in data.get("items",[]):
        vid=item.get("id",{}).get("videoId")
        sn=item.get("snippet",{})
        detail=detalhes.get(vid,{})
        dsn=detail.get("snippet",sn)
        status=detail.get("status",{})
        out.append({
            "videoId":vid, "url":"https://www.youtube.com/watch?v="+str(vid),
            "titulo":dsn.get("title",""), "descricao":dsn.get("description",""),
            "canal":dsn.get("channelTitle",""), "canalId":dsn.get("channelId",""),
            "publicadoEm":dsn.get("publishedAt",""), "statusPrivacidade":status.get("privacyStatus","desconhecido"),
            "embeddable":status.get("embeddable"), "termoPesquisa":termo,
            "coletadoEm":agora(), "statusValidacao":"PENDENTE_REVISAO_HUMANA",
            "nota":"Resultado da API não comprova versão, ano, geração, mercado brasileiro nem conteúdo visual."
        })
    cache[termo]=out
    salvar(CACHE,cache)
    return out

def termos(v):
    base=" ".join(x for x in [v.get("marca"),v.get("modelo"),v.get("versao"),v.get("ano")] if x)
    sem_ano=" ".join(x for x in [v.get("marca"),v.get("modelo"),v.get("versao")] if x)
    modelo=" ".join(x for x in [v.get("marca"),v.get("modelo")] if x)
    return list(dict.fromkeys([base+" avalia\u00e7\u00e3o Brasil", sem_ano+" avalia\u00e7\u00e3o Brasil", modelo+" apresenta\u00e7\u00e3o Brasil"]))

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--limite",type=int,default=0,help="máximo de veículos novos nesta execução; 0 = todos")
    args=parser.parse_args()
    if not KEY:
        raise SystemExit("ERRO: defina YOUTUBE_API_KEY como variável de ambiente. A chave não deve ser gravada no ZIP.")
    catalog=carregar(VEICULOS,{})
    vehicles=catalog.get("veiculos",[])
    cache=carregar(CACHE,{})
    progress=carregar(PROGRESSO,{"processados":[],"erros":[],"iniciadoEm":agora()})
    candidates=carregar(CANDIDATOS,{"geradoEm":agora(),"veiculos":{}})
    done=set(progress.get("processados",[]))
    count=0
    for v in vehicles:
        vid=v["id"]
        if vid in done: continue
        if args.limite and count>=args.limite: break
        resultados=[]
        erros=[]
        quota_ou_acesso_negado = False
        for termo in termos(v):
            try:
                encontrados=consulta(termo,cache)
                resultados.extend(encontrados)
                # só tenta variações mais amplas quando a busca anterior não retorna candidatos
                if encontrados: break
            except urllib.error.HTTPError as e:
                erros.append({"termo":termo,"erro":f"HTTP {e.code}: {e.reason}"})
                if e.code in (403, 429):
                    quota_ou_acesso_negado = True
                    break
            except Exception as e:
                erros.append({"termo":termo,"erro":str(e)})
                break
        unicos={x.get("videoId"):x for x in resultados if x.get("videoId")}
        candidates["veiculos"][vid]={
            "veiculo":{k:v.get(k) for k in ["marca","modelo","versao","ano","locadoras"]},
            "termosTentados":termos(v),"candidatos":list(unicos.values()),"erros":erros,
            "pesquisadoEm":agora(),"status":"PENDENTE_REVISAO_HUMANA"
        }
        if erros:
            progress.setdefault("erros",[]).append({"veiculoId":vid,"erros":erros,"em":agora()})
        else:
            progress["processados"].append(vid)
        progress["atualizadoEm"]=agora()
        salvar(CANDIDATOS,candidates); salvar(PROGRESSO,progress)
        count+=1
        if quota_ou_acesso_negado:
            print("Cota/permissão da API atingida; execução pausada para preservar a retomada.")
            break
        time.sleep(0.15)
    print(json.dumps({"processadosNestaExecucao":count,"totalProcessados":len(progress["processados"]),"totalVeiculos":len(vehicles),"candidatosPorVeiculo":len(candidates["veiculos"]),"erros":len(progress.get("erros",[]))},ensure_ascii=False,indent=2))

if __name__=="__main__": main()
