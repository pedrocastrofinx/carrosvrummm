'use strict';
/* ===== Clove Assistente =====
   Camada independente de IA. Sempre recupera os registros ANTES de responder.
   - Sem endpoint configurado: modo demonstração (regras determinísticas sobre os dados locais).
   - Com endpoint (S.config.cloveEndpoint): envia pergunta + registros recuperados para o SEU servidor,
     que guarda a chave da API em variável de ambiente e chama o modelo. Nenhuma chave fica no navegador. */
const Clove = {
  modo: () => (S.config.cloveEndpoint || window.DRYVE) ? 'api' : 'demo',   // hospedado (window.DRYVE) usa /api/clove da Vercel

  REGRAS: 'Responda apenas com base nos registros enviados em "contexto". Se a informação não estiver nos registros, diga que não encontrou. Nunca invente preços, condições, disponibilidade ou especificações. Ao comparar, deixe explícitos os campos "Não informado". Se houver modelos parecidos, peça ao atendente que escolha.',

  STOP: new Set('a o os as um uma de do da dos das em no na nos nas para pra por com que qual quais quanto quantos tem temos tenho ha ainda e ou se me te mostre mostra encontre encontrar achar procure busque este esse essa esta desse deste dele dela ele ela carro carros veiculo veiculos modelo modelos entre sobre mais menos ate'.split(' ')),

  tokens: q => norm(q).replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean),

  /* veículos citados na pergunta, agrupados por modelo */
  citados(q) {
    const tk = Clove.tokens(q), txt = ' ' + tk.join(' ') + ' ', compact = tk.join('');
    const achados = [];
    for (const v of veiculosAtivos()) {
      const mw = Clove.tokens(v.modelo); if (!mw.length) continue;
      const frase = ' ' + mw.join(' ') + ' ';
      const cm = mw.join('');
      const hit = txt.includes(frase) || (/\d/.test(cm) && compact.includes(cm));
      if (hit) achados.push(v);
    }
    return achados;
  },

  /* estreita por versão/marca se a pergunta citar */
  estreitar(lista, q) {
    const tk = new Set(Clove.tokens(q));
    const comVersao = lista.filter(v => v.versao && Clove.tokens(v.versao).every(t => tk.has(t)));
    return comVersao.length ? comVersao : lista;
  },

  resolverFoco(q) {
    const tem = Clove.citados(q);
    const modelos = [...new Set(tem.map(v => norm(v.marca + ' ' + v.modelo)))];
    const grupos = modelos.map(m => Clove.estreitar(tem.filter(v => norm(v.marca + ' ' + v.modelo) === m), q));
    const usouAnterior = !grupos.length && /\b(esse|este|essa|desse|deste|dele|ele|o mesmo|do carro)\b/.test(norm(q)) && (S.clove.foco || []).length;
    const gr = grupos.length ? grupos : (usouAnterior ? [S.clove.foco.map(veiculo).filter(Boolean)] : []);
    return { grupos: gr, usouAnterior: !!usouAnterior };
  },

  preco(q) {
    const m = norm(q).match(/(?:ate|abaixo de|menos de|no maximo|maximo de)\s*(?:r\$)?\s*([\d.,]+)/);
    if (!m) return null;
    const n = Number(m[1].replace(/\./g, '').replace(',', '.')); return isNaN(n) ? null : n;
  },

  /* ---- respostas ---- */
  async responder(pergunta) {
    const r = Clove.local(pergunta);          // recuperação sempre acontece primeiro
    if (/R\$|mensalidade|a partir de/i.test(r.texto) || (r.veiculos || []).some(id => precoMin(veiculo(id)) != null)) r.texto += '\n(Valores de referência: podem estar desatualizados. Confira no site oficial da locadora antes de passar ao cliente.)';
    if (Clove.modo() === 'api') {
      try {
        const token = window.DRYVE ? await window.DRYVE.token() : null;
        const resp = await fetch(S.config.cloveEndpoint || '/api/clove', {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
          body: JSON.stringify({ pergunta, regras: Clove.REGRAS, historico: S.clove.historico.slice(-6).map(h => ({ papel: h.papel, texto: h.texto })), contexto: Clove.contexto(r) })
        });
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const j = await resp.json();
        if (j && j.texto) return { ...r, texto: j.texto, via: 'api' };
        throw new Error('resposta sem "texto"');
      } catch (e) {
        return { ...r, texto: r.texto, aviso: 'A API do Clove não respondeu (' + e.message + '). Esta resposta veio do modo demonstração, sobre os dados locais.', via: 'demo' };
      }
    }
    return { ...r, via: 'demo' };
  },

  /* registros compactos enviados à API (somente o que a pergunta recuperou; nada de mídia não autorizada) */
  contexto(r) {
    return {
      veiculos: (r.veiculos || []).map(id => veiculo(id)).filter(Boolean).map(v => ({
        id: v.id, nome: nomeVeiculo(v), categoria: v.categoria, locadora: locadora(v.locadoraId)?.nome || null, ano: v.ano, cambio: v.cambio, combustivel: v.combustivel,
        lugares: v.lugares, motor: v.motor, potencia: v.potencia, portaMalas: v.portaMalas, consumo: v.consumo, fonteTecnica: v.fabricanteFonte, planos: v.planos, disponibilidade: v.disponibilidade, fonte: v.fonte, atualizadoEm: v.atualizadoEm,
        faltando: camposFaltando(v)
      })),
      midias: (r.midias || []).map(id => midia(id)).filter(m => m && compartilhavel(m)).map(m => ({ id: m.id, titulo: m.titulo, categoria: m.categoria, veiculo: nomeVeiculo(veiculo(m.veiculoId)) || null })),
      rascunhoLocal: r.texto
    };
  },

  linhaVeic(v) {
    const p = precoMin(v);
    return `${nomeVeiculo(v)} — ${nomeCatVeic(v.categoria)}${locadora(v.locadoraId) ? ' — ' + locadora(v.locadoraId).nome : ''}${p != null ? ' — a partir de ' + brl(p) : ' — mensalidade não informada'}`;
  },

  local(q) {
    const n = norm(q), out = { texto: '', veiculos: [], midias: [], tabela: null, mensagem: null, escolha: null };
    const { grupos, usouAnterior } = Clove.resolverFoco(q);
    const ambiguos = grupos.filter(g => g.length > 1);
    const unicos = grupos.map(g => g[0]).filter((v, i) => grupos[i].length === 1);
    const preco = Clove.preco(q);
    const catMatch = CATEGORIAS_VEICULO.find(([k, nome]) => new RegExp('\\b' + norm(nome) + 's?\\b').test(n) || (k === 'picape' && /pick-?up/.test(n)));
    const locMatch = S.locadoras.find(l => n.includes(norm(l.nome)));
    const foco = unicos;
    const ehMsg = /mensagem|texto pronto|enviar (esse|este|o|ao|pro|para)|prepare|redija|escreva/.test(n);
    const ehVideo = /video|filme|gravac/.test(n);
    const ehFoto = /\bfotos?\b|imagem|imagens/.test(n);

    if (/^(oi|ola|bom dia|boa tarde|boa noite|ajuda|o que voce faz)/.test(n) && !grupos.length) {
      out.texto = 'Olá! Eu consulto os veículos, locadoras e vídeos cadastrados no Hub. Posso listar carros por categoria ou preço, comparar modelos, achar vídeos, mostrar prazos e franquias, preparar mensagens para o cliente e apontar o que falta na ficha de um carro.';
      return out;
    }

    /* modelos parecidos → pede escolha */
    if (ambiguos.length && !ehMsg) {
      const g = ambiguos[0];
      out.texto = `Encontrei ${g.length} registros de ${marcaModelo(g[0])}. Qual deles você quer dizer?`;
      out.veiculos = g.map(v => v.id); out.escolha = true; return out;
    }

    if (/falta|faltam|completar|incompleta/.test(n)) {
      const alvo = foco.length ? foco : null;
      if (!alvo) { out.texto = 'De qual veículo? Cite o modelo (ex.: "O que falta na ficha do Pulse?").'; return out; }
      out.texto = alvo.map(v => { const f = camposFaltando(v); return `**${nomeVeiculo(v)}**: ` + (f.length ? 'falta ' + f.join(', ') + '.' : 'a ficha está completa nos campos principais.'); }).join('\n');
      out.veiculos = alvo.map(v => v.id); return out;
    }

    if (/diferenca|compar|versus|\bvs\b|melhor entre/.test(n)) {
      if (unicos.length >= 2) {
        const vs = unicos.slice(0, 3); out.veiculos = vs.map(v => v.id);
        const lin = (nome, fn) => [nome, ...vs.map(v => fn(v))];
        out.tabela = {
          cols: ['', ...vs.map(nomeVeiculo)],
          rows: [
            lin('Locadora', v => locadora(v.locadoraId)?.nome), lin('Categoria', v => v.categoria ? nomeCatVeic(v.categoria) : null), lin('Ano/modelo', v => v.ano),
            lin('Câmbio', v => v.cambio), lin('Combustível', v => v.combustivel), lin('Lugares', v => v.lugares), lin('Motorização', v => v.motor), lin('Porta-malas', v => v.portaMalas),
            lin('Consumo', v => v.consumo), lin('Mensalidade (menor)', v => precoMin(v) != null ? brl(precoMin(v)) : null),
            lin('Prazos', v => (v.planos || []).map(p => p.prazo).filter(Boolean).join(', ') + ' meses' === ' meses' ? null : [...new Set((v.planos || []).map(p => p.prazo).filter(Boolean))].join(', ') + ' meses'),
            lin('Vídeos cadastrados', v => String(midiasDe(v.id).filter(m => m.tipo === 'video' && compartilhavel(m)).length))
          ]
        };
        out.texto = 'Comparação com base apenas nos dados cadastrados. Onde está "Não informado", o campo ainda não foi preenchido na ficha.';
        return out;
      }
      out.texto = unicos.length === 1 ? 'Encontrei só um dos modelos no catálogo. Qual é o outro para comparar?' : 'Não identifiquei dois modelos do catálogo na pergunta. Ex.: "Diferença entre HB20 e Onix".';
      return out;
    }

    if (ehMsg) {
      const v = foco[0] || (ambiguos[0] && ambiguos[0][0]);
      if (!v) { out.texto = 'Para qual veículo? Cite o modelo ou abra a ficha dele e peça de novo.'; return out; }
      let m = null;
      if (ehVideo || /interior|retirada|painel/.test(n)) {
        const pool = Clove.filtrarVideos(v, n);
        m = pool[0] || null;
        if (!m) { out.texto = `Não encontrei vídeo ${Clove.tipoVideoTxt(n)} do ${marcaModelo(v)} para anexar. Posso preparar a mensagem de apresentação do veículo, sem vídeo.`; }
      }
      const tpl = m ? templatePara(m) : S.templates.find(t => t.tipo === 'veiculo' && !t.arquivado);
      if (!tpl) { out.texto = 'Não há template ativo para esse tipo de mensagem.'; return out; }
      const r = preencher(tpl.corpo, ctxMensagem({ v, m }));
      out.mensagem = r.texto; out.veiculos = [v.id]; if (m) out.midias = [m.id];
      out.texto = (out.texto ? out.texto + '\n' : '') + `Mensagem preparada com o template "${tpl.nome}".` + (r.faltando.length ? ' Campos sem dados e omitidos: ' + r.faltando.map(k => ROTULO_CAMPO[k] || k).join(', ') + '.' : '');
      return out;
    }

    if (ehVideo || ehFoto) {
      const tipo = ehVideo ? 'video' : 'foto';
      if (foco.length) {
        const res = []; let restritos = 0;
        for (const v of foco) {
          const todos = Clove.filtrarMidias(v, n, tipo, true);
          res.push(...todos.filter(compartilhavel)); restritos += todos.filter(m => !compartilhavel(m)).length;
        }
        out.veiculos = foco.map(v => v.id);
        if (res.length) { out.midias = res.slice(0, 8).map(m => m.id); out.texto = `Encontrei ${res.length} ${tipo === 'video' ? 'vídeo(s)' : 'foto(s)'} ${Clove.tipoVideoTxt(n)} de ${foco.map(marcaModelo).join(' e ')}.`; }
        else out.texto = `Não encontrei ${tipo === 'video' ? 'vídeo' : 'foto'} ${Clove.tipoVideoTxt(n)} de ${foco.map(marcaModelo).join(' e ')} cadastrado${tipo === 'video' ? '' : 'a'}.`;
        if (restritos) out.texto += ` Há ${restritos} item(ns) de cliente sem autorização de uso, que ficam restritos e não posso indicar para envio.`;
        return out;
      }
      const hits = S.midias.filter(m => !m.arquivado && m.tipo === tipo && compartilhavel(m) && Clove.casaMidia(m, n)).slice(0, 8);
      if (hits.length) { out.midias = hits.map(m => m.id); out.texto = `Encontrei ${hits.length} material(is) que combinam com a busca.`; }
      else out.texto = 'Não encontrei esse material. Cite o modelo do carro (ex.: "vídeo do interior do Pulse") ou tente outro termo.';
      return out;
    }

    if (/qual locadora|quem oferece|oferece (este|esse|o)|onde (tem|encontro)/.test(n) && foco.length) {
      out.veiculos = foco.map(v => v.id);
      out.texto = foco.map(v => `**${nomeVeiculo(v)}**: ` + (locadora(v.locadoraId) ? locadora(v.locadoraId).nome + '.' : 'locadora não informada na ficha.')).join('\n');
      return out;
    }

    if (/prazo|franquia|quilometragem|\bkm\b|plano|mensalidade|valor|preco|quanto custa/.test(n) && foco.length) {
      out.veiculos = foco.map(v => v.id);
      out.texto = foco.map(v => {
        const ps = (v.planos || []).filter(p => p.prazo || p.km || p.mensalidade != null);
        return `**${nomeVeiculo(v)}**:\n` + (ps.length ? ps.map(p => `• ${p.prazo ? p.prazo + ' meses' : 'prazo não informado'} · ${p.km ? Number(p.km).toLocaleString('pt-BR') + ' km/mês' : 'franquia não informada'} · ${brl(p.mensalidade)}`).join('\n') : 'nenhum plano cadastrado ainda (prazo, franquia e mensalidade: Não informado).');
      }).join('\n');
      return out;
    }

    /* listagem por critérios */
    if (catMatch || preco != null || locMatch || /quais|liste|listar|opcoes|temos/.test(n)) {
      let lista = veiculosAtivos();
      const crit = [];
      if (catMatch) { lista = lista.filter(v => v.categoria === catMatch[0]); crit.push(catMatch[1]); }
      if (locMatch) { lista = lista.filter(v => v.locadoraId === locMatch.id); crit.push('na ' + locMatch.nome); }
      if (preco != null) { lista = lista.filter(v => (v.planos || []).some(p => p.mensalidade != null && p.mensalidade <= preco)); crit.push('até ' + brlSimples(preco) + '/mês'); }
      lista.sort((a, b) => (precoMin(a) ?? 1e12) - (precoMin(b) ?? 1e12));
      out.veiculos = lista.slice(0, 8).map(v => v.id);
      if (lista.length) {
        out.texto = `Encontrei ${lista.length} veículo(s)${crit.length ? ' — ' + crit.join(', ') : ''}.`;
        if (preco != null) out.texto += ' Só entram carros com mensalidade cadastrada; os sem preço informado não podem ser avaliados.';
      } else {
        const semPreco = preco != null ? veiculosAtivos().filter(v => (!catMatch || v.categoria === catMatch[0]) && precoMin(v) == null).length : 0;
        out.texto = `Não encontrei veículos${crit.length ? ' ' + crit.join(', ') : ''} no catálogo.` + (semPreco ? ` Existem ${semPreco} do filtro sem mensalidade cadastrada, então não dá para saber se cabem nesse valor.` : '');
      }
      return out;
    }

    if (foco.length) {
      out.veiculos = foco.map(v => v.id);
      out.texto = foco.map(v => `**${nomeVeiculo(v)}**\n` + Clove.linhaVeic(v) + '\n' + (camposFaltando(v).length ? 'Campos ainda não informados: ' + camposFaltando(v).join(', ') + '.' : 'Ficha completa.')).join('\n\n');
      if (usouAnterior) out.texto = '(Considerando o veículo da conversa)\n' + out.texto;
      return out;
    }

    /* busca livre */
    const termos = Clove.tokens(q).filter(t => !Clove.STOP.has(t) && t.length > 2);
    const vs = veiculosAtivos().filter(v => termos.some(t => norm([v.marca, v.modelo, v.versao, v.categoria, locadora(v.locadoraId)?.nome].join(' ')).includes(t))).slice(0, 6);
    const ms = S.midias.filter(m => !m.arquivado && compartilhavel(m) && termos.some(t => Clove.casaMidia(m, t))).slice(0, 6);
    if (vs.length || ms.length) { out.veiculos = vs.map(v => v.id); out.midias = ms.map(m => m.id); out.texto = 'Estes registros combinam com o que você escreveu:'; }
    else out.texto = 'Não encontrei essa informação nos dados cadastrados. Tente citar o modelo do veículo ou a locadora, ou peça "o que falta na ficha do …".';
    return out;
  },

  tipoVideoTxt(n) {
    if (/painel|multimidia/.test(n)) return 'do painel/multimídia';
    if (/interior|banco|porta.?mala/.test(n)) return 'do interior';
    if (/extern|exterior/.test(n)) return 'do exterior';
    if (/cliente|retirad|entrega|depoimento/.test(n)) return 'de cliente/retirada';
    return '';
  },
  catsDaPergunta(n) {
    if (/painel|multimidia/.test(n)) return ['painel', 'demonstracao'];
    if (/interior|banco|porta.?mala/.test(n)) return ['interior', 'painel', 'bancos', 'portamalas', 'demonstracao'];
    if (/extern|exterior/.test(n)) return ['exterior'];
    if (/cliente|retirad|entrega|depoimento/.test(n)) return ['retirada', 'depoimento'];
    return null;
  },
  filtrarMidias(v, n, tipo, incluirRestritos) {
    const cats = Clove.catsDaPergunta(n);
    return midiasDe(v.id).filter(m => m.tipo === tipo && (!cats || cats.includes(m.categoria)));
  },
  filtrarVideos(v, n) { return Clove.filtrarMidias(v, n, 'video').filter(compartilhavel); },
  casaMidia(m, n) {
    const alvo = norm([m.titulo, m.descricao, (m.tags || []).join(' '), nomeVeiculo(veiculo(m.veiculoId)), nomeCat(m.categoria)].join(' '));
    const cats = Clove.catsDaPergunta(n);
    if (cats && cats.includes(m.categoria)) return true;
    return Clove.tokens(n).filter(t => !Clove.STOP.has(t) && t.length > 2 && !/video|foto|imagem/.test(t)).some(t => alvo.includes(t));
  },

  perguntasSugeridas() {
    const v = veiculosAtivos().find(x => x.planos?.length) || veiculosAtivos()[0];
    const m = v ? v.modelo : 'Pulse';
    return ['Quais SUVs temos até R$ 3.000 por mês?', `Temos vídeo mostrando o interior do ${m}?`, `Quais são os prazos e franquias do ${m}?`, `O que falta na ficha do ${m}?`, `Prepare uma mensagem para enviar o ${m} ao cliente`, 'Qual a diferença entre o HB20 e o Onix?'];
  }
};
