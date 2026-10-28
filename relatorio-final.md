# Relatório de auditoria DryveHub

Data: 27/10/2026  
Status: PARCIAL — NÃO CONCLUÍDO

## Inventário

- Ofertas nos catálogos: 280
- Veículos únicos por marca + modelo + versão + ano: 277
- Veículos com vídeo real validado: 0
- Veículos sem vídeo validado: 277
- Correspondências exatas: 0
- Correspondências exatas sem ano confirmado: 0
- Correspondências gerais de modelo: 0
- Correspondências aproximadas aprovadas: 0
- Links confirmados como válidos: 0
- Links confirmados como quebrados: 0
- Links aguardando validação: 0 (nenhum candidato foi pesquisado nesta execução)
- Campos técnicos existentes preenchidos nos catálogos (contagem por oferta/campo): 1015

## Contagem dos dados técnicos atuais

| Campo | Ofertas com dado existente |
|---|---:|
| ano | 175 |
| motor | 0 |
| potencia | 0 |
| torque | 0 |
| cambio | 174 |
| combustivel | 150 |
| consumo | 0 |
| autonomia | 0 |
| bateria | 0 |
| portas | 0 |
| lugares | 175 |
| portaMalas | 0 |
| dimensoes | 0 |
| equipamento | 0 |
| conforto | 175 |
| conectividade | 166 |
| seguranca | 0 |
| fabricanteFonte | 0 |

## Motivo da não conclusão

A variável de ambiente `YOUTUBE_API_KEY` não estava configurada neste ambiente. Portanto, não foi possível executar a pesquisa solicitada pela YouTube Data API v3. Para não inventar vídeos, versões, links ou especificações, nenhum vídeo foi marcado como validado e nenhum dado técnico ausente foi preenchido sem fonte.

## Pendências

Todos os 277 veículos estão listados em `data/pendencias-pesquisa.json` e `data/veiculos-pesquisa.json`. Cada registro preserva marca, modelo, versão, ano quando disponível, locadoras e referência às ofertas. Os campos técnicos ausentes foram mantidos como pendentes.

## Pesquisa retomável

Foi incluído `tools/pesquisar_videos.py`, que consulta a YouTube Data API v3, salva cache e checkpoint e retoma veículos já processados. Os resultados da API são apenas candidatos: o script os marca `PENDENTE_REVISAO_HUMANA`; eles não são inseridos automaticamente como vídeos oficiais. A chave é lida exclusivamente de `YOUTUBE_API_KEY` no ambiente e não é gravada nos arquivos.

Para iniciar no Windows PowerShell:
```powershell
$env:YOUTUBE_API_KEY = "SUA_CHAVE_LOCAL"
python tools/pesquisar_videos.py --limite 10
```
Remova a variável da sessão quando terminar. Execute em lotes pequenos e acompanhe a cota do projeto Google Cloud. Não coloque a chave no ZIP nem em arquivos servidos ao navegador.

## Testes realizados

- ZIP original extraído e estrutura `js/` e `data/` preservadas.
- README, `index.html`, todos os arquivos `js/` e os catálogos foram inspecionados.
- Catálogos parseados: 280 ofertas, 277 combinações únicas.
- Sintaxe JavaScript: 8 arquivos validados com `node --check`.
- Sintaxe do script de pesquisa Python: compilação concluída.
- Teste em navegador real e console: não executado neste ambiente.
- Links de vídeos: não há links cadastrados para validar.

## Conclusão

A entrega contém o inventário deduplicado, o estado de pendências, cache/checkpoint e uma ferramenta retomável para pesquisa. **Não atende ainda ao critério de conclusão pedido**, porque não há vídeos validados nem enriquecimento técnico com fontes oficiais. O relatório explicita essa limitação em vez de declarar sucesso indevido.
