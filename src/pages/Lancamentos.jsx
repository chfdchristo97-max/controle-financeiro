import React, { useMemo, useState } from 'react'
import { SeletorMes, useLancamentosDoMes, totaisDoMes, LinhaLancamento, alternarPago } from '../components/Comum.jsx'
import { Dinheiro } from '../privacidade.jsx'
import { rotuloDia } from '../format'

const FILTROS = [['todos', 'Todos'], ['despesa', 'Despesas'], ['receita', 'Receitas'], ['pendentes', 'Pendentes'], ['transferencia', 'Transferências']]

export default function Lancamentos({ contas, categorias, versao, atualizar, mes, setMes, abrirForm }) {
  const { dados, erro } = useLancamentosDoMes(mes, versao)
  const [filtro, setFiltro] = useState('todos')
  const [busca, setBusca] = useState('')
  const t = totaisDoMes(dados)

  const grupos = useMemo(() => {
    const q = busca.trim().toLowerCase()
    const lista = (dados || []).filter(l => {
      if (filtro === 'pendentes' && l.pago) return false
      if (!['todos', 'pendentes'].includes(filtro) && l.tipo !== filtro) return false
      if (!q) return true
      const cat = categorias.find(c => c.id === l.categoria_id)?.nome || ''
      return `${l.descricao} ${cat} ${l.observacao || ''}`.toLowerCase().includes(q)
    })
    const m = new Map()
    for (const l of lista) { if (!m.has(l.data)) m.set(l.data, []); m.get(l.data).push(l) }
    return [...m.entries()].map(([dia, itens]) => ({
      dia, itens,
      liquido: itens.reduce((s, l) => s + (l.tipo === 'receita' ? +l.valor : l.tipo === 'despesa' ? -l.valor : 0), 0),
    }))
  }, [dados, filtro, busca, categorias])

  return (
    <section className="pagina">
      <header className="pagina-topo">
        <h1>Lançamentos</h1>
        <SeletorMes mes={mes} setMes={setMes} />
      </header>

      <div className="faixa-totais">
        <div><span className="ponto p-receita">Entrou</span><Dinheiro v={t.receitas} /></div>
        <div><span className="ponto p-despesa">Saiu</span><Dinheiro v={t.despesas} /></div>
        <div><span>Resultado</span><Dinheiro v={t.receitas - t.despesas} className={t.receitas - t.despesas < 0 ? 'v-despesa' : ''} /></div>
      </div>
      {(t.receitasPrev !== t.receitas || t.despesasPrev !== t.despesas) && (
        <p className="nota">Contando os pendentes, o mês fecha em <Dinheiro v={t.receitasPrev - t.despesasPrev} />.</p>
      )}

      <div className="filtros" role="tablist">
        {FILTROS.map(([id, nome]) => (
          <button key={id} role="tab" aria-selected={filtro === id} className={`filtro ${filtro === id ? 'ativo' : ''}`} onClick={() => setFiltro(id)}>{nome}</button>
        ))}
      </div>
      <input className="busca" type="search" placeholder="Buscar" value={busca} onChange={e => setBusca(e.target.value)} />

      {erro && <p className="aviso erro">Não foi possível carregar os lançamentos. Verifique sua internet e tente de novo.</p>}
      {!dados && !erro && <div className="spinner" />}
      {dados && grupos.length === 0 && (
        <div className="vazio">
          <p>{dados.length === 0 ? 'Nenhum lançamento neste mês.' : 'Nada encontrado com esse filtro.'}</p>
          {dados.length === 0 && <button className="primario compacto" onClick={() => abrirForm()}>Adicionar lançamento</button>}
        </div>
      )}
      {grupos.map(({ dia, itens, liquido }) => (
        <div key={dia} className="grupo-dia">
          <h3><span>{rotuloDia(dia)}</span>{liquido !== 0 && <Dinheiro v={Math.abs(liquido)} sinal={liquido > 0 ? '+' : '−'} className="dia-total" />}</h3>
          <ul className="lista-lanc">
            {itens.map(l => <LinhaLancamento key={l.id} l={l} contas={contas} categorias={categorias} abrir={abrirForm} alternarPago={(x) => alternarPago(x, atualizar)} />)}
          </ul>
        </div>
      ))}
    </section>
  )
}
