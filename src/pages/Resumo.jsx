import React, { useMemo } from 'react'
import { SeletorMes, useLancamentosDoMes, totaisDoMes, LinhaLancamento, alternarPago } from '../components/Comum.jsx'
import { Icone } from '../components/Icones.jsx'
import { Dinheiro } from '../privacidade.jsx'

const TIPO_CONTA = { corrente: 'Conta corrente', poupanca: 'Poupança', carteira: 'Carteira', cartao: 'Cartão', outro: 'Outra' }

function saudacao() {
  const h = new Date().getHours()
  return h < 5 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

export default function Resumo({ contas, categorias, versao, atualizar, mes, setMes, abrirForm, irPara, oculto, setOculto }) {
  const { dados } = useLancamentosDoMes(mes, versao)
  const t = totaisDoMes(dados)
  const ativas = contas.filter(c => c.ativa)
  const saldoTotal = ativas.reduce((s, c) => s + Number(c.saldo_atual), 0)
  const resultado = t.receitasPrev - t.despesasPrev

  const porCategoria = useMemo(() => {
    const m = new Map()
    for (const l of dados || []) {
      if (l.tipo !== 'despesa') continue
      const k = l.categoria_id || 'sem'
      m.set(k, (m.get(k) || 0) + Number(l.valor))
    }
    return [...m.entries()]
      .map(([id, v]) => ({ id, cat: categorias.find(c => c.id === id) || { nome: 'Sem categoria', icone: '•', cor: '#8a8f9b' }, v }))
      .sort((a, b) => b.v - a.v)
  }, [dados, categorias])
  const totalDesp = porCategoria.reduce((s, x) => s + x.v, 0) || 1

  const pendentes = (dados || []).filter(l => !l.pago && l.tipo !== 'transferencia').sort((a, b) => a.data.localeCompare(b.data))
  const somaBarra = t.receitasPrev + t.despesasPrev
  const pctRec = somaBarra ? (t.receitasPrev / somaBarra) * 100 : 50

  return (
    <section className="pagina">
      <header className="hero">
        <div className="hero-topo">
          <span>{saudacao()}</span>
          <button className="icone-btn" onClick={() => setOculto(!oculto)} aria-label={oculto ? 'Mostrar valores' : 'Ocultar valores'}>
            <Icone nome={oculto ? 'olhoFechado' : 'olho'} tamanho={20} />
          </button>
        </div>
        <p className="hero-rotulo">Saldo em contas</p>
        <Dinheiro v={saldoTotal} className={`hero-saldo ${saldoTotal < 0 ? 'negativo' : ''}`} />
      </header>

      {ativas.length > 0 && (
        <div className="trilho-contas" role="list" aria-label="Contas">
          {ativas.map(c => (
            <div key={c.id} className="cartao-conta" role="listitem" style={{ '--cor': c.cor }}>
              <span className="cartao-tipo">{TIPO_CONTA[c.tipo]}</span>
              <span className="cartao-nome">{c.nome}</span>
              <Dinheiro v={c.saldo_atual} className={`cartao-saldo ${Number(c.saldo_atual) < 0 ? 'v-despesa' : ''}`} />
            </div>
          ))}
          <button className="cartao-conta cartao-novo" onClick={() => irPara('ajustes')}>
            <Icone nome="mais" tamanho={18} /><span>Nova conta</span>
          </button>
        </div>
      )}

      <div className="painel">
        <header className="painel-topo">
          <h2>Balanço</h2>
          <SeletorMes mes={mes} setMes={setMes} />
        </header>
        <div className="resultado">
          <span>{resultado >= 0 ? 'Sobra prevista' : 'Falta prevista'}</span>
          <Dinheiro v={Math.abs(resultado)} className={resultado >= 0 ? 'v-receita' : 'v-despesa'} />
        </div>
        <div className="balanca" aria-hidden="true">
          <i className="b-receita" style={{ flexBasis: `${pctRec}%` }} />
          <i className="b-despesa" style={{ flexBasis: `${100 - pctRec}%` }} />
        </div>
        <div className="dupla">
          <div>
            <span className="ponto p-receita">Receitas</span>
            <Dinheiro v={t.receitasPrev} className="dupla-valor" />
            {t.receitasPrev !== t.receitas && <small><Dinheiro v={t.receitas} /> já recebido</small>}
          </div>
          <div>
            <span className="ponto p-despesa">Despesas</span>
            <Dinheiro v={t.despesasPrev} className="dupla-valor" />
            {t.despesasPrev !== t.despesas && <small><Dinheiro v={t.despesas} /> já pago</small>}
          </div>
        </div>
      </div>

      {pendentes.length > 0 && (
        <div className="painel">
          <header className="painel-topo">
            <h2>Pendentes</h2>
            <span className="contador">{pendentes.length}</span>
          </header>
          <ul className="lista-lanc">
            {pendentes.slice(0, 4).map(l => (
              <LinhaLancamento key={l.id} l={l} contas={contas} categorias={categorias} abrir={abrirForm} alternarPago={(x) => alternarPago(x, atualizar)} />
            ))}
          </ul>
          {pendentes.length > 4 && <button className="link-rodape" onClick={() => irPara('lancamentos')}>Ver todos os {pendentes.length} pendentes</button>}
        </div>
      )}

      <div className="painel">
        <header className="painel-topo"><h2>Para onde foi o dinheiro</h2></header>
        {dados && porCategoria.length === 0 && <p className="sutil">Nenhuma despesa neste mês.</p>}
        {porCategoria.length > 0 && (
          <div className="faixa-cats" aria-hidden="true">
            {porCategoria.map(({ id, cat, v }) => <i key={id} style={{ flexBasis: `${(v / totalDesp) * 100}%`, background: cat.cor }} />)}
          </div>
        )}
        <ul className="lista-cats">
          {porCategoria.map(({ id, cat, v }) => (
            <li key={id}>
              <span className="cat-emoji" style={{ '--cor': cat.cor }}>{cat.icone}</span>
              <span className="cat-nome">{cat.nome}</span>
              <span className="cat-pct">{Math.round((v / totalDesp) * 100)}%</span>
              <Dinheiro v={v} className="cat-valor" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
