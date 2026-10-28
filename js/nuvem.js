'use strict';
/* ===== Biblioteca compartilhada na nuvem (Supabase Storage + tabela midias_compartilhadas) =====
   So existe quando o Hub esta hospedado e o supabase/midias.sql ja foi executado. O administrador envia arquivos;
   todos os analistas veem e BAIXAM o mesmo arquivo (link assinado, valido por pouco tempo, so para quem fez login).
   Arquivos na nuvem usam fileId = "cloud:<caminho>"; o resto do Hub trata como qualquer arquivo (miniatura, player, download). */
const BUCKET = 'midias';
window.Nuvem = {
  remotos: null, _ultima: '', _ocupado: false, _urls: new Map(),
  /* ativo = hospedado E tabela existe (midiasNuvem === null significa que a tabela nao existe ou a leitura falhou) */
  ativo: () => !!(window.DRYVE && window.DRYVE.sb && window.DRYVE.midiasNuvem !== null && window.DRYVE.midiasNuvem !== undefined),

  async urlAssinada(path, { baixarComo } = {}) {
    const k = path + '|' + (baixarComo || ''), c = Nuvem._urls.get(k);
    if (c && c.ate > Date.now()) return c.url;
    const { data, error } = await window.DRYVE.sb.storage.from(BUCKET).createSignedUrl(path, 3600, baixarComo ? { download: baixarComo } : undefined);
    if (error || !data) return null;
    Nuvem._urls.set(k, { url: data.signedUrl, ate: Date.now() + 50 * 60 * 1000 });
    return data.signedUrl;
  },

  async enviar(blob, nome, tipoMime) {
    const seguro = nome.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9._-]+/g, '_');
    const path = crypto.randomUUID() + '/' + seguro;
    const { error } = await window.DRYVE.sb.storage.from(BUCKET).upload(path, blob, { contentType: tipoMime, upsert: false });
    if (error) throw new Error('Falha no envio para a nuvem: ' + error.message);
    return 'cloud:' + path;
  },

  async remover(id) {
    if (!Nuvem.ativo() || !isAdmin() || !String(id).startsWith('cloud:')) return;
    try { await window.DRYVE.sb.storage.from(BUCKET).remove([id.slice(6)]); } catch (e) { console.warn('remover', e); }
  },

  acharVeiculo(r) {
    if (!r.marca || !r.modelo) return null;
    const chave = norm([r.marca, r.modelo, r.versao || ''].join('|'));
    return S.veiculos.find(x => !x.demo && norm([x.marca, x.modelo, x.versao || ''].join('|')) === chave
      && (!r.locadora || !x.locadoraId || norm(locadora(x.locadoraId)?.nome) === norm(r.locadora))) || null;
  },

  deLinha(r) {
    const v = Nuvem.acharVeiculo(r), loc = r.locadora && S.locadoras.find(l => norm(l.nome) === norm(r.locadora));
    return {
      id: 'n_' + r.id, nuvem: true, nuvemId: r.id, nuvemPendente: false, tipo: r.tipo, titulo: r.titulo, descricao: r.descricao || '', categoria: r.categoria || 'outros',
      veiculoId: v ? v.id : '', locadoraId: loc ? loc.id : (v ? v.locadoraId : ''), modeloChave: r.todas_versoes ? norm(r.marca + '|' + r.modelo) : '',
      veiculoIds: (r.vinculos || []).map(Nuvem.acharVeiculo).filter(Boolean).map(x => x.id), modeloChaves: r.todas_versoes ? [...new Set((r.vinculos || []).map(x => norm(x.marca + '|' + x.modelo)))] : [],
      origem: 'arquivo', fileId: 'cloud:' + r.storage_path, thumbId: r.thumb_path ? 'cloud:' + r.thumb_path : '', url: '', nomeOriginal: r.nome_original || r.titulo,
      tamanho: r.tamanho || 0, tags: r.tags || [], criadoEm: r.criado_em, autorizacao: r.autorizacao || '', cliente: r.cliente || null,
      permiteDownload: r.permite_download !== false, arquivado: false, _veic: { marca: r.marca, modelo: r.modelo, versao: r.versao, locadora: r.locadora }
    };
  },

  paraLinha(m) {
    const v = veiculo(m.veiculoId), id = x => String(x || '').replace(/^cloud:/, '');
    const extras = (m.veiculoIds || []).map(veiculo).filter(Boolean).map(x => ({ marca: x.marca, modelo: x.modelo, versao: x.versao || '', locadora: locadora(x.locadoraId)?.nome || '' }));
    return {
      ...(extras.length || Nuvem.colVinc ? { vinculos: extras } : {}),
      id: m.nuvemId, tipo: m.tipo, titulo: m.titulo, descricao: m.descricao || '', categoria: m.categoria || 'outros',
      marca: v?.marca || m._veic?.marca || '', modelo: v?.modelo || m._veic?.modelo || '', versao: v?.versao || m._veic?.versao || '',
      locadora: locadora(m.locadoraId)?.nome || (v && locadora(v.locadoraId)?.nome) || m._veic?.locadora || '', todas_versoes: !!m.modeloChave,
      storage_path: id(m.fileId), thumb_path: m.thumbId ? id(m.thumbId) : null, nome_original: m.nomeOriginal || '', tamanho: m.tamanho || 0,
      permite_download: m.permiteDownload !== false, tags: m.tags || [], autorizacao: m.autorizacao || '', cliente: m.cliente || null, criado_em: m.criadoEm
    };
  },

  /* a nuvem e a fonte da verdade: troca as midias de nuvem locais pelas da tabela (mantem as ainda nao sincronizadas) */
  mesclar() {
    if (!Nuvem.ativo()) return;
    const linhas = window.DRYVE.midiasNuvem, ids = new Set(linhas.map(r => r.id));
    Nuvem.colVinc = linhas.some(r => 'vinculos' in r);   // coluna criada por supabase/midias-vinculos.sql
    S.midias = S.midias.filter(m => !m.nuvem || (m.nuvemPendente && !ids.has(m.nuvemId)));
    for (const r of linhas) S.midias.push(Nuvem.deLinha(r));
    Nuvem.remotos = ids;
  },

  async sincronizar() {
    if (!Nuvem.ativo() || !isAdmin() || Nuvem._ocupado) return;
    const locais = S.midias.filter(m => m.nuvem && m.nuvemId), linhas = locais.map(Nuvem.paraLinha);
    const apagar = [...(Nuvem.remotos || [])].filter(id => !locais.some(m => m.nuvemId === id));
    const assin = JSON.stringify(linhas) + '|' + apagar.join(',');
    if (assin === Nuvem._ultima) return;
    Nuvem._ocupado = true;
    try {
      const sb = window.DRYVE.sb;
      if (linhas.length) { const { error } = await sb.from('midias_compartilhadas').upsert(linhas, { onConflict: 'id' }); if (error) throw error; }
      if (apagar.length) { const { error } = await sb.from('midias_compartilhadas').delete().in('id', apagar); if (error) throw error; }
      locais.forEach(m => { m.nuvemPendente = false; });
      Nuvem.remotos = new Set(locais.map(m => m.nuvemId)); Nuvem._ultima = assin;
    } catch (e) { toast(/vinculos/.test(e.message || '') ? 'Para ligar uma mídia a vários veículos na nuvem, rode supabase/midias-vinculos.sql no Supabase (SQL Editor).' : 'Não consegui sincronizar a biblioteca na nuvem: ' + (e.message || e), 'err'); }
    finally { Nuvem._ocupado = false; }
  }
};
