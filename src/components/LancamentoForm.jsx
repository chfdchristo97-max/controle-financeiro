import React, { useMemo, useState } from 'react'
import { supabase } from '../supabase'
import Folha from './Folha.jsx'
import { Icone } from './Icones.jsx'
import { hojeISO, isoData, lerValor, valorParaCampo, somarMesesISO, moeda } from '../format'

const TIPOS = [['despesa', 'Despesa'], ['receita', 'Receita'], ['transferencia', 'Transferência']]
const TITULOS = { despesa: 'despesa', receita: 'receita', transferencia: 'transferência' }

function dataCurta(iso) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}${y !== String(new Date().getFullYear()) ? '/' + y.slice(2) : ''}`
}

function EscolhaData({ valor, mudar, rotulo = 'Data' }) {
  const hoje = hojeISO()
  const ontem = isoData(new Date(Date.now() - 864e5))
  const outra = valor !== hoje && valor !== ontem
  return (
    <div className="campo">
      <span className="rotulo">{rotulo}</span>
      <div className="pilulas">
        <button className={`pilula ${valor === hoje ? 'ativo' : ''}`} onClick={() => mudar(hoje)}>Hoje</button>
        <button className={`pilula ${valor === ontem ? 'ativo' : ''}`} onClick={() => mudar(ontem)}>Ontem</button>
        <label className={`pilula pilula-data ${outra ? 'ativo' : ''}`}>
          <Icone nome="calendario" tamanho={15} />
          <span>{outra ? dataCurta(valor) : 'Outra data'}</span>
          <input type="date" value={valor} onChange={e => e.target.value && mudar(e.target.value)} aria-label="Escolher data" />
        </label>
      </div>
    </div>
  )
}

function EscolhaConta({ contas, valor, mudar, rotulo, excluir }) {
  return (
    <div className="campo">
      <span className="rotulo">{rotulo}</span>
      <div className="pilulas rolagem">
        {contas.filter(c => c.id !== excluir).map(c => (
          <button key={c.id} className={`pilula ${valor === c.id ? 'ativo' : ''}`} onClick={() => mudar(c.id)}>
            <i className="bolinha" style={{ background: c.cor }} />{c.nome}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function LancamentoForm({ inicial, contas, categorias, fechar, salvou }) {
  const editando = Boolean(inicial.id)
  const ehParcela = Boolean(inicial.parcelamento_id)
  const [tipo, setTipo] = useState(inicial.tipo || 'despesa')
  const [valor, setValor] = useState(valorParaCampo(inicial.valor ?? ''))
  const [descricao, setDescricao] = useState(inicial.descricao || '')
  const [categoriaId, setCategoriaId] = useState(inicial.categoria_id || '')
  const [contaId, setContaId] = useState(inicial.conta_id || contas[0]?.id || '')
  const [destinoId, setDestinoId] = useState(inicial.conta_destino_id || '')
  const [data, setData] = useState(inicial.data || hojeISO())
  const [pago, setPago] = useState(inicial.pago ?? true)
  const [observacao, setObservacao] = useState(inicial.observacao || '')
  const [parcelado, setParcelado] = useState(false)
  const [totalParcelas, setTotalParcelas] = useState('2')
  const [jaPagas, setJaPagas] = useState('0')
  const [erro, setErro] = useState(null)
  const [ocupado, setOcupado] = useState(false)

  const cats = useMemo(() => categorias.filter(c => c.tipo === tipo), [categorias, tipo])

  function trocarTipo(t) {
    setTipo(t); setErro(null)
    if (t === 'transferencia') { setCategoriaId(''); setParcelado(false) }
    else if (!categorias.find(c => c.id === categoriaId && c.tipo === t)) setCategoriaId('')
  }

  async function salvar() {
    setErro(null)
    const v = lerValor(valor)
    if (!(v > 0)) return setErro('Informe um valor maior que zero.')
    if (!contaId) return setErro('Escolha uma conta. Você pode criar contas em Ajustes.')
    if (tipo === 'transferencia' && (!destinoId || destinoId === contaId)) return setErro('Escolha a conta de destino.')
    const base = {
      tipo, valor: v, descricao: descricao.trim(), data, pago: tipo === 'transferencia' ? true : pago,
      conta_id: contaId,
      conta_destino_id: tipo === 'transferencia' ? destinoId : null,
      categoria_id: tipo === 'transferencia' ? null : (categoriaId || null),
      observacao: observacao.trim() || null,
    }
    setOcupado(true)
    let res
    if (editando) {
      res = await supabase.from('lancamentos').update(base).eq('id', inicial.id)
    } else if (parcelado) {
      const total = parseInt(totalParcelas, 10), pagas = parseInt(jaPagas, 10) || 0
      if (!(total >= 2 && total <= 480)) { setOcupado(false); return setErro('O total de parcelas deve ficar entre 2 e 480.') }
      if (pagas < 0 || pagas >= total) { setOcupado(false); return setErro('Parcelas já pagas deve ser menor que o total.') }
      const p = await supabase.from('parcelamentos').insert({
        descricao: base.descricao || 'Parcelado', valor_parcela: v, total_parcelas: total,
        parcelas_pagas_antes: pagas, data_primeira_parcela: data,
        conta_id: contaId, categoria_id: base.categoria_id,
      }).select().single()
      if (p.error) { setOcupado(false); return setErro(p.error.message) }
      const linhas = []
      for (let n = pagas + 1, i = 0; n <= total; n++, i++) {
        linhas.push({ ...base, data: somarMesesISO(data, i), pago: i === 0 ? pago : false, parcelamento_id: p.data.id, parcela_numero: n })
      }
      res = await supabase.from('lancamentos').insert(linhas)
    } else {
      res = await supabase.from('lancamentos').insert(base)
    }
    setOcupado(false)
    if (res.error) setErro(res.error.message)
    else salvou()
  }

  async function excluir(tudo) {
    if (!window.confirm(tudo ? 'Excluir todas as parcelas deste parcelamento?' : 'Excluir este lançamento?')) return
    setOcupado(true)
    const res = tudo
      ? await supabase.from('parcelamentos').delete().eq('id', inicial.parcelamento_id)
      : await supabase.from('lancamentos').delete().eq('id', inicial.id)
    setOcupado(false)
    if (res.error) setErro(res.error.message)
    else salvou()
  }

  const total = parseInt(totalParcelas, 10) || 0, pagasN = parseInt(jaPagas, 10) || 0, vNum = lerValor(valor) || 0

  return (
    <Folha cheia titulo={editando ? 'Editar lançamento' : `Nova ${TITULOS[tipo]}`} fechar={fechar} rodape={
      <>
        {erro && <p className="aviso erro">{erro}</p>}
        <button className="primario" onClick={salvar} disabled={ocupado}>
          {ocupado ? 'Salvando…' : editando ? 'Salvar alterações' : parcelado ? `Lançar ${Math.max(total - pagasN, 0)} parcelas` : 'Salvar'}
        </button>
      </>
    }>
      <div className="segmentos" role="radiogroup" aria-label="Tipo">
        {TIPOS.map(([id, nome]) => (
          <button key={id} role="radio" aria-checked={tipo === id} className={`seg-${id} ${tipo === id ? 'ativo' : ''}`}
            onClick={() => trocarTipo(id)} disabled={ehParcela && id === 'transferencia'}>{nome}</button>
        ))}
      </div>

      <label className={`valor-grande tipo-${tipo}`}>
        <span className="rotulo">{parcelado ? 'Valor de cada parcela' : 'Valor'}</span>
        <span className="valor-linha">
          <b>R$</b>
          <input inputMode="decimal" placeholder="0,00" value={valor} autoFocus={!editando}
            style={{ width: `${Math.max(valor.length, 4) + 0.6}ch` }}
            onChange={e => setValor(e.target.value.replace(/[^\d.,]/g, ''))}
            onBlur={() => { const v = lerValor(valor); if (v > 0) setValor(valorParaCampo(v)) }} />
        </span>
      </label>

      <input className="descricao" value={descricao} onChange={e => setDescricao(e.target.value)}
        placeholder={tipo === 'receita' ? 'Descrição (ex: salário)' : tipo === 'despesa' ? 'Descrição (ex: mercado)' : 'Descrição (opcional)'} />

      {tipo !== 'transferencia' && (
        <div className="campo">
          <span className="rotulo">Categoria</span>
          <div className="grade-cats">
            {cats.map(c => (
              <button key={c.id} className={`tile ${categoriaId === c.id ? 'ativo' : ''}`} style={{ '--cor': c.cor }}
                onClick={() => setCategoriaId(categoriaId === c.id ? '' : c.id)} aria-pressed={categoriaId === c.id}>
                <span className="tile-emoji" aria-hidden="true">{c.icone}</span>
                <span className="tile-nome">{c.nome}</span>
              </button>
            ))}
          </div>
          {cats.length === 0 && <p className="sutil">Nenhuma categoria de {tipo}. Crie em Ajustes.</p>}
        </div>
      )}

      {tipo === 'transferencia' ? (
        <>
          <EscolhaConta contas={contas} valor={contaId} mudar={(id) => { setContaId(id); if (id === destinoId) setDestinoId('') }} rotulo="Sai de" />
          <EscolhaConta contas={contas} valor={destinoId} mudar={setDestinoId} rotulo="Vai para" excluir={contaId} />
        </>
      ) : (
        <EscolhaConta contas={contas} valor={contaId} mudar={setContaId} rotulo="Conta" />
      )}

      <EscolhaData valor={data} mudar={setData} rotulo={parcelado ? 'Próxima parcela' : 'Data'} />

      {tipo !== 'transferencia' && (
        <div className="grupo-opcoes">
          <label className="alternar">
            <span>{tipo === 'receita' ? 'Já recebido' : 'Já pago'}{parcelado ? ' (esta parcela)' : ''}</span>
            <input type="checkbox" checked={pago} onChange={e => setPago(e.target.checked)} />
            <span className="trilho" aria-hidden="true" />
          </label>
          {!editando && (
            <label className="alternar">
              <span>Parcelado</span>
              <input type="checkbox" checked={parcelado} onChange={e => setParcelado(e.target.checked)} />
              <span className="trilho" aria-hidden="true" />
            </label>
          )}
          {parcelado && (
            <div className="parcelas">
              <label className="campo-mini">Total de parcelas
                <input inputMode="numeric" value={totalParcelas} onChange={e => setTotalParcelas(e.target.value.replace(/\D/g, ''))} />
              </label>
              <label className="campo-mini">Já pagas antes
                <input inputMode="numeric" value={jaPagas} onChange={e => setJaPagas(e.target.value.replace(/\D/g, ''))} />
              </label>
              {total > pagasN && (
                <p className="sutil">Da {pagasN + 1}ª à {total}ª parcela, uma por mês{vNum ? `, somando ${moeda((total - pagasN) * vNum)}` : ''}. As já pagas não mexem no seu saldo.</p>
              )}
            </div>
          )}
        </div>
      )}

      {ehParcela && <p className="sutil">Parcela {inicial.parcela_numero} de {inicial.parcelamentos?.total_parcelas}. Alterações valem só para esta parcela.</p>}

      <label className="campo">
        <span className="rotulo">Observação</span>
        <textarea rows="2" value={observacao} onChange={e => setObservacao(e.target.value)} />
      </label>

      {editando && (
        <div className="acoes-excluir">
          <button className="perigo" onClick={() => excluir(false)} disabled={ocupado}><Icone nome="lixo" tamanho={16} />{ehParcela ? 'Excluir esta parcela' : 'Excluir lançamento'}</button>
          {ehParcela && <button className="perigo" onClick={() => excluir(true)} disabled={ocupado}><Icone nome="lixo" tamanho={16} />Excluir parcelamento inteiro</button>}
        </div>
      )}
    </Folha>
  )
}
