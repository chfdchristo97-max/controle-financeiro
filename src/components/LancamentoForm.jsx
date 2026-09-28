import React, { useMemo, useState } from 'react'
import { supabase } from '../supabase'
import Folha from './Folha.jsx'
import { hojeISO, lerValor, valorParaCampo, somarMesesISO } from '../format'

const TIPOS = [
  { id: 'despesa', nome: 'Despesa' },
  { id: 'receita', nome: 'Receita' },
  { id: 'transferencia', nome: 'Transferência' },
]

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
    setTipo(t)
    if (t === 'transferencia') { setCategoriaId(''); setParcelado(false) }
    else if (!categorias.find(c => c.id === categoriaId && c.tipo === t)) setCategoriaId('')
  }

  async function salvar() {
    setErro(null)
    const v = lerValor(valor)
    if (!(v > 0)) return setErro('Informe um valor maior que zero.')
    if (!contaId) return setErro('Escolha uma conta. Você pode criar contas em Ajustes.')
    if (tipo === 'transferencia' && (!destinoId || destinoId === contaId)) return setErro('Escolha uma conta de destino diferente da de origem.')
    const base = {
      tipo, valor: v, descricao: descricao.trim(), data, pago,
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
    const pergunta = tudo ? 'Excluir todas as parcelas deste parcelamento?' : 'Excluir este lançamento?'
    if (!window.confirm(pergunta)) return
    setOcupado(true)
    const res = tudo
      ? await supabase.from('parcelamentos').delete().eq('id', inicial.parcelamento_id)
      : await supabase.from('lancamentos').delete().eq('id', inicial.id)
    setOcupado(false)
    if (res.error) setErro(res.error.message)
    else salvou()
  }

  const titulo = editando ? 'Editar lançamento' : 'Novo lançamento'

  return (
    <Folha titulo={titulo} fechar={fechar} rodape={
      <>
        {erro && <p className="aviso erro">{erro}</p>}
        <button className="primario" onClick={salvar} disabled={ocupado}>{ocupado ? 'Salvando…' : editando ? 'Salvar alterações' : 'Adicionar lançamento'}</button>
      </>
    }>
      <div className={`segmentos tipo-${tipo}`} role="radiogroup" aria-label="Tipo">
        {TIPOS.map(t => (
          <button key={t.id} role="radio" aria-checked={tipo === t.id} className={tipo === t.id ? 'ativo' : ''}
            onClick={() => trocarTipo(t.id)} disabled={ehParcela && t.id === 'transferencia'}>{t.nome}</button>
        ))}
      </div>

      <label className="campo-valor">
        <span>{parcelado ? 'Valor de cada parcela' : 'Valor'}</span>
        <div className={`valor-entrada tipo-${tipo}`}>
          <b>R$</b>
          <input inputMode="decimal" placeholder="0,00" value={valor} autoFocus={!editando}
            onChange={e => setValor(e.target.value)}
            onBlur={() => { const v = lerValor(valor); if (v > 0) setValor(valorParaCampo(v)) }} />
        </div>
      </label>

      <label className="campo">Descrição
        <input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder={tipo === 'receita' ? 'Ex: Salário de setembro' : tipo === 'despesa' ? 'Ex: Mercado' : 'Ex: Reserva do mês'} />
      </label>

      {tipo !== 'transferencia' && (
        <div className="campo">
          <span>Categoria</span>
          <div className="chips">
            {cats.map(c => (
              <button key={c.id} className={`chip ${categoriaId === c.id ? 'ativo' : ''}`} style={{ '--cor': c.cor }}
                onClick={() => setCategoriaId(categoriaId === c.id ? '' : c.id)}>
                <span aria-hidden="true">{c.icone}</span>{c.nome}
              </button>
            ))}
            {cats.length === 0 && <p className="sutil">Nenhuma categoria de {tipo}. Crie em Ajustes.</p>}
          </div>
        </div>
      )}

      <div className="linha-2">
        <label className="campo">{tipo === 'transferencia' ? 'De' : 'Conta'}
          <select value={contaId} onChange={e => setContaId(e.target.value)}>
            {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </label>
        {tipo === 'transferencia' ? (
          <label className="campo">Para
            <select value={destinoId} onChange={e => setDestinoId(e.target.value)}>
              <option value="">Escolha…</option>
              {contas.filter(c => c.id !== contaId).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </label>
        ) : (
          <label className="campo">{parcelado ? 'Próxima parcela' : 'Data'}
            <input type="date" value={data} onChange={e => setData(e.target.value)} required />
          </label>
        )}
      </div>
      {tipo === 'transferencia' && (
        <label className="campo">Data
          <input type="date" value={data} onChange={e => setData(e.target.value)} required />
        </label>
      )}

      <label className="alternar">
        <input type="checkbox" checked={pago} onChange={e => setPago(e.target.checked)} />
        <span className="trilho" aria-hidden="true" />
        <span>{tipo === 'receita' ? 'Já recebido' : 'Já pago'}{parcelado ? ' (esta parcela)' : ''}</span>
      </label>

      {!editando && tipo !== 'transferencia' && (
        <label className="alternar">
          <input type="checkbox" checked={parcelado} onChange={e => setParcelado(e.target.checked)} />
          <span className="trilho" aria-hidden="true" />
          <span>Parcelado</span>
        </label>
      )}

      {parcelado && (
        <div className="caixa-parcelas">
          <div className="linha-2">
            <label className="campo">Total de parcelas
              <input inputMode="numeric" value={totalParcelas} onChange={e => setTotalParcelas(e.target.value.replace(/\D/g, ''))} />
            </label>
            <label className="campo">Já pagas antes
              <input inputMode="numeric" value={jaPagas} onChange={e => setJaPagas(e.target.value.replace(/\D/g, ''))} />
            </label>
          </div>
          <p className="sutil">
            {(() => { const t = parseInt(totalParcelas, 10) || 0, p = parseInt(jaPagas, 10) || 0, v = lerValor(valor) || 0
              return t > p ? `Serão lançadas ${t - p} parcelas mensais, da ${p + 1}ª à ${t}ª. As que você já pagou não mexem no seu saldo.` + (v ? ` Restante: ${((t - p) * v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.` : '') : '' })()}
          </p>
        </div>
      )}

      {ehParcela && (
        <p className="sutil">Parcela {inicial.parcela_numero} de {inicial.parcelamentos?.total_parcelas}. Alterações valem só para esta parcela.</p>
      )}

      <label className="campo">Observação
        <textarea rows="2" value={observacao} onChange={e => setObservacao(e.target.value)} />
      </label>

      {editando && (
        <div className="acoes-excluir">
          <button className="perigo" onClick={() => excluir(false)} disabled={ocupado}>{ehParcela ? 'Excluir esta parcela' : 'Excluir lançamento'}</button>
          {ehParcela && <button className="perigo" onClick={() => excluir(true)} disabled={ocupado}>Excluir parcelamento inteiro</button>}
        </div>
      )}
    </Folha>
  )
}
