#!/usr/bin/env python3
"""Envia a tabela de precos PRIVADA da Localiza (data/tabela-localiza.js) para o Supabase (tabela tabelas_privadas).
Depois disso o arquivo NAO precisa (nem deve) subir para o GitHub/Vercel: o Hub busca os precos no Supabase, so apos o login.
Variaveis de ambiente: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (chave secreta; nunca em arquivo, nunca no navegador).
Uso: python tools/enviar_tabela_supabase.py [--arquivo caminho] [--dry-run]
"""
import argparse, json, os, pathlib, re, sys, urllib.error, urllib.request
from datetime import datetime, timezone

RAIZ = pathlib.Path(__file__).resolve().parents[1]

def ler_tabela(caminho):
    t = pathlib.Path(caminho).read_text(encoding="utf-8-sig")
    m = re.search(r"window\.TABELA_LOCALIZA\s*=\s*", t)
    if not m: raise SystemExit("ERRO: nao achei 'window.TABELA_LOCALIZA =' em " + str(caminho))
    corpo = t[m.end():].strip().rstrip(";").strip()
    try: return json.loads(corpo)
    except json.JSONDecodeError as e: raise SystemExit(f"ERRO: JSON invalido em {caminho}: {e}")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--arquivo", default=str(RAIZ / "data" / "tabela-localiza.js"))
    ap.add_argument("--dry-run", action="store_true", help="so valida o arquivo; nao envia nada")
    a = ap.parse_args()
    dados = ler_tabela(a.arquivo)
    for k in ("colunas", "marcas", "modelos"):
        if not isinstance(dados.get(k), list) or not dados[k]: raise SystemExit(f"ERRO: campo '{k}' ausente ou vazio; arquivo inesperado.")
    resumo = {"fonte": dados.get("fonte"), "periodo": dados.get("periodo"), "marcas": len(dados["marcas"]), "modelos": len(dados["modelos"]), "chaves": sorted(dados.keys())}
    print(json.dumps(resumo, ensure_ascii=False, indent=2))
    if a.dry_run:
        print("dry-run: nada foi enviado."); return
    url, chave = os.environ.get("SUPABASE_URL", "").strip().rstrip("/"), os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if not url or not chave: raise SystemExit("ERRO: defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.")
    corpo = json.dumps({"chave": "tabela_localiza", "dados": dados, "atualizado_em": datetime.now(timezone.utc).isoformat()}, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(url + "/rest/v1/tabelas_privadas?on_conflict=chave", data=corpo, method="POST", headers={
        "apikey": chave, **({"Authorization": "Bearer " + chave} if chave.startswith("eyJ") else {}), "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates,return=minimal"})
    try:
        with urllib.request.urlopen(req, timeout=120) as r: print("enviado: HTTP", r.status, f"({len(corpo)//1024} KB)")
    except urllib.error.HTTPError as e:
        raise SystemExit(f"ERRO do Supabase: HTTP {e.code} {e.read().decode('utf-8', 'replace')[:300]}")

if __name__ == "__main__": main()
