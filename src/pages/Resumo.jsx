import React, { useMemo } from 'react'
import { SeletorMes, useLancamentosDoMes, totaisDoMes, LinhaLancamento, alternarPago } from '../components/Comum.jsx'
import { moeda, hojeISO } from '../format'

const TIPO_CONTA = { corrente: 'Conta corrente', poupanca: 'Poupança', carteira: 'Carteira', cartao: 'Cartão', outro: 'Outra' }

export default function Resumo({ contas, categorias, versao, atualizar, mes, setMes, abrirForm, irPara }) {
  const { dados } = useLancamentosDoMes(mes, versao)
  const t = totaisDoMes(dados)
  const ativas = contas.filter(c => c.ativa)
  const saldoTotal = ativas.reduce((s, c) => s + Number(c.saldo_atual), 0)

  const porCategoria = useMemo(() => {
    const m = new Map()
    for (const l of dados || []) {
      if (l.tipo !== 'despesa') continue
      const k = l.categoria_id || 'sem'
      m.set(k, (m.get(k) || 0) + Number(l.valor))
    }
    const lista = [...m.entries()].map(([id, v]) => ({ cat: categorias.find(c => c.id === id) || { nome: 'Sem categoria', icone: '•', cor: '#94a3b8' }, v }))
    lista.sort((a, b) => b.v - a.v)
    return lista
  }, [dados, categorias])
  const maiorCat = porCategoria[0]?.v || 1

  const pendentes = (dados || []).filter(l => !l.pago && l.tipo !== 'transferencia').sort((a, b) => a.data.localeCompare(b.data))
  const hoje = hojeISO()

  const entradaBarra = t.receitasPrev + t.despesasPrev
  const pctReceita = entradaBarra ? (t.receitasPrev / entradaBarra) * 100 : 50

  return (
    <section className="pagina">
      <div className="saldo-geral">
        <span>Saldo em contas</span>
        <strong className={saldoTotal < 0 ? 'v-despesa' : ''}>{moeda(saldoTotal)}</strong>
      </div>

      <div className="bloco">
        <header className="bloco-topo">
          <h2>Mês</h2>
          <SeletorMes mes={mes} setMes={setMes} />
        </header>
        <div className="balanca" aria-hidden="true">
          <i className="b-receita" style={{ width: `${pctReceita}%` }} />
          <i className="b-despesa" style={{ width: `${100 - pctReceita}%` }} />
        </div>
        <div className="balanca-legenda">
          <div><span>Receitas</span><b className="v-receita">{moeda(t.receitasPrev)}</b>{t.receitasPrev !== t.receitas && <small>{moeda(t.receitas)} recebido</small>}</div>
          <div className="dir"><span>Despesas</span><b className="v-despesa">{moeda(t.despesasPrev)}</b>{t.despesasPrev !== t.despesas && <small>{moeda(t.despesas)} pago</small>}</div>
        </div>
        <p className="resultado-mes">
          {t.receitasPrev - t.despesasPrev >= 0 ? 'Sobra prevista de ' : 'Falta prevista de '}
          <b>{moeda(Math.abs(t.receitasPrev - t.despesasPrev))}</b>
        </p>
      </div>

      {pendentes.length > 0 && (
        <div className="bloco">
          <header className="bloco-topo"><h2>Pendentes do mês</h2><span className="contador">{pendentes.length}</span></header>
          <ul className="lista-lanc">
            {pendentes.slice(0, 5).map(l => (
              <LinhaLancamento key={l.id} extra={l.data < hoje ? 'atrasado' : ''} l={l} contas={contas} categorias={categorias} abrir={abrirForm} alternarPago={(x) => alternarPago(x, atualizar)} />
            ))}
          </ul>
          {pendentes.length > 5 && <button className="link" onClick={() => irPara('lancamentos')}>Ver todos os pendentes</button>}
        </div>
      )}

      <div className="bloco">
        <header className="bloco-topo"><h2>Contas</h2></header>
        <ul className="lista-contas">
          {ativas.map(c => (
            <li key={c.id}>
              <span className="marca-cor" style={{ background: c.cor }} />
              <span className="conta-nome">{c.nome}<small>{TIPO_CONTA[c.tipo]}</small></span>
              <b className={Number(c.saldo_atual) < 0 ? 'v-despesa' : ''}>{moeda(c.saldo_atual)}</b>
            </li>
          ))}
          {ativas.length === 0 && <li className="sutil">Crie sua primeira conta em Ajustes.</li>}
        </ul>
      </div>

      <div className="bloco">
        <header className="bloco-topo"><h2>Para onde foi o dinheiro</h2></header>
        {porCategoria.length === 0 && <p className="sutil">Sem despesas neste mês ainda.</p>}
        <ul className="lista-cats">
          {porCategoria.map(({ cat, v }) => (
            <li key={cat.id || 'sem'}>
              <div className="cat-linha"><span>{cat.icone} {cat.nome}</span><b>{moeda(v)}</b></div>
              <div className="cat-barra"><i style={{ width: `${(v / maiorCat) * 100}%`, background: cat.cor }} /></div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
