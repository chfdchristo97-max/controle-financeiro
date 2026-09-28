import React, { useMemo, useState } from 'react'
import { SeletorMes, useLancamentosDoMes, totaisDoMes, LinhaLancamento, alternarPago } from '../components/Comum.jsx'
import { moeda, rotuloDia } from '../format'

export default function Lancamentos({ contas, categorias, versao, atualizar, mes, setMes, abrirForm }) {
  const { dados, erro } = useLancamentosDoMes(mes, versao)
  const [filtro, setFiltro] = useState('todos')
  const [busca, setBusca] = useState('')
  const t = totaisDoMes(dados)

  const grupos = useMemo(() => {
    const q = busca.trim().toLowerCase()
    const lista = (dados || []).filter(l => {
      if (filtro === 'pendentes' && l.pago) return false
      if (filtro !== 'todos' && filtro !== 'pendentes' && l.tipo !== filtro) return false
      if (!q) return true
      const cat = categorias.find(c => c.id === l.categoria_id)?.nome || ''
      return (l.descricao + ' ' + cat + ' ' + (l.observacao || '')).toLowerCase().includes(q)
    })
    const m = new Map()
    for (const l of lista) { if (!m.has(l.data)) m.set(l.data, []); m.get(l.data).push(l) }
    return [...m.entries()]
  }, [dados, filtro, busca, categorias])

  return (
    <section className="pagina">
      <header className="pagina-topo">
        <h1>Lançamentos</h1>
        <SeletorMes mes={mes} setMes={setMes} />
      </header>

      <div className="faixa-totais">
        <div><span>Entrou</span><b className="v-receita">{moeda(t.receitas)}</b></div>
        <div><span>Saiu</span><b className="v-despesa">{moeda(t.despesas)}</b></div>
        <div><span>Resultado</span><b>{moeda(t.receitas - t.despesas)}</b></div>
      </div>
      {(t.receitasPrev !== t.receitas || t.despesasPrev !== t.despesas) && (
        <p className="sutil previsto">Com os pendentes, o mês fecha em {moeda(t.receitasPrev - t.despesasPrev)}.</p>
      )}

      <div className="filtros">
        {[['todos', 'Todos'], ['despesa', 'Despesas'], ['receita', 'Receitas'], ['transferencia', 'Transferências'], ['pendentes', 'Pendentes']].map(([id, nome]) => (
          <button key={id} className={`chip ${filtro === id ? 'ativo' : ''}`} onClick={() => setFiltro(id)}>{nome}</button>
        ))}
      </div>
      <input className="busca" type="search" placeholder="Buscar por descrição ou categoria" value={busca} onChange={e => setBusca(e.target.value)} />

      {erro && <p className="aviso erro">Não foi possível carregar: {erro}</p>}
      {!dados && !erro && <div className="spinner" />}
      {dados && grupos.length === 0 && (
        <div className="vazio">
          <p>{dados.length === 0 ? 'Nenhum lançamento neste mês.' : 'Nada encontrado com esse filtro.'}</p>
          {dados.length === 0 && <button className="primario" onClick={() => abrirForm()}>Adicionar lançamento</button>}
        </div>
      )}
      {grupos.map(([dia, itens]) => (
        <div key={dia} className="grupo-dia">
          <h3>{rotuloDia(dia)}</h3>
          <ul className="lista-lanc">
            {itens.map(l => <LinhaLancamento key={l.id} l={l} contas={contas} categorias={categorias} abrir={abrirForm} alternarPago={(x) => alternarPago(x, atualizar)} />)}
          </ul>
        </div>
      ))}
    </section>
  )
}
