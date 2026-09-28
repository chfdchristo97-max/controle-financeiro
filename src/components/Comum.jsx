import React, { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { Icone } from './Icones.jsx'
import { nomeMes, somarMeses, isoData, fimMes, moeda } from '../format'

export function SeletorMes({ mes, setMes }) {
  return (
    <div className="seletor-mes">
      <button className="icone-btn" onClick={() => setMes(somarMeses(mes, -1))} aria-label="Mês anterior"><Icone nome="esquerda" /></button>
      <strong>{nomeMes(mes)}</strong>
      <button className="icone-btn" onClick={() => setMes(somarMeses(mes, 1))} aria-label="Próximo mês"><Icone nome="direita" /></button>
    </div>
  )
}

export function useLancamentosDoMes(mes, versao) {
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState(null)
  useEffect(() => {
    let vivo = true
    setDados(null)
    supabase.from('lancamentos').select('*, parcelamentos(total_parcelas)')
      .gte('data', isoData(mes)).lte('data', isoData(fimMes(mes)))
      .order('data', { ascending: false }).order('created_at', { ascending: false })
      .then(({ data, error }) => { if (!vivo) return; if (error) setErro(error.message); else setDados(data) })
    return () => { vivo = false }
  }, [mes, versao])
  return { dados, erro }
}

export function totaisDoMes(lista) {
  const t = { receitas: 0, despesas: 0, receitasPrev: 0, despesasPrev: 0 }
  for (const l of lista || []) {
    if (l.tipo === 'receita') { t.receitasPrev += +l.valor; if (l.pago) t.receitas += +l.valor }
    if (l.tipo === 'despesa') { t.despesasPrev += +l.valor; if (l.pago) t.despesas += +l.valor }
  }
  return t
}

export function Valor({ v, tipo, sinal = true }) {
  const s = tipo === 'despesa' ? '−' : tipo === 'receita' && sinal ? '+' : ''
  return <span className={`valor v-${tipo}`}>{s}{moeda(v)}</span>
}

export function LinhaLancamento({ l, contas, categorias, abrir, alternarPago, extra = '' }) {
  const cat = categorias.find(c => c.id === l.categoria_id)
  const conta = contas.find(c => c.id === l.conta_id)
  const destino = contas.find(c => c.id === l.conta_destino_id)
  const titulo = l.descricao || cat?.nome || (l.tipo === 'transferencia' ? 'Transferência' : 'Sem descrição')
  const sub = l.tipo === 'transferencia'
    ? `${conta?.nome ?? '?'} para ${destino?.nome ?? '?'}`
    : [l.descricao && cat ? cat.nome : null, conta?.nome].filter(Boolean).join(', ')
  return (
    <li className={`lanc ${l.pago ? '' : 'pendente'} ${extra}`}>
      <button className="lanc-principal" onClick={() => abrir(l)}>
        <span className="lanc-icone" style={{ '--cor': l.tipo === 'transferencia' ? 'var(--primaria)' : cat?.cor || 'var(--sutil)' }}>
          {l.tipo === 'transferencia' ? <Icone nome="transferir" tamanho={18} /> : (cat?.icone || '•')}
        </span>
        <span className="lanc-texto">
          <span className="lanc-titulo">{titulo}</span>
          <span className="lanc-sub">
            <span className="lanc-sub-txt">{sub}</span>
            {l.parcela_numero && <em className="etiqueta">{l.parcela_numero}/{l.parcelamentos?.total_parcelas}</em>}
            {!l.pago && <em className="etiqueta pend">{l.tipo === 'receita' ? 'a receber' : 'a pagar'}</em>}
          </span>
        </span>
        <Valor v={l.valor} tipo={l.tipo} />
      </button>
      {l.tipo === 'transferencia' ? <span className="marcar-vazio" /> : (
        <button className={`marcar ${l.pago ? 'feito' : ''}`} onClick={() => alternarPago(l)}
          aria-label={l.pago ? 'Marcar como pendente' : l.tipo === 'receita' ? 'Marcar como recebido' : 'Marcar como pago'}>
          {l.pago && <Icone nome="check" tamanho={14} />}
        </button>
      )}
    </li>
  )
}

export async function alternarPago(l, atualizar) {
  const { error } = await supabase.from('lancamentos').update({ pago: !l.pago }).eq('id', l.id)
  if (error) alert(error.message); else atualizar()
}
