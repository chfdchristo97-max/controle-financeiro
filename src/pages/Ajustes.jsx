import React, { useState } from 'react'
import { supabase } from '../supabase'
import Folha from '../components/Folha.jsx'
import { moeda, lerValor, valorParaCampo } from '../format'

const CORES = ['#0f766e', '#2563eb', '#7c3aed', '#db2777', '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#0891b2', '#475569']
const TIPOS_CONTA = [['corrente', 'Conta corrente'], ['poupanca', 'Poupança'], ['carteira', 'Carteira (dinheiro)'], ['cartao', 'Cartão de crédito'], ['outro', 'Outra']]

function EscolhaCor({ valor, mudar }) {
  return (
    <div className="cores" role="radiogroup" aria-label="Cor">
      {CORES.map(c => (
        <button key={c} role="radio" aria-checked={valor === c} aria-label={c} className={valor === c ? 'ativo' : ''} style={{ background: c }} onClick={() => mudar(c)} />
      ))}
    </div>
  )
}

function FormConta({ inicial, fechar, salvou }) {
  const [nome, setNome] = useState(inicial.nome || '')
  const [tipo, setTipo] = useState(inicial.tipo || 'corrente')
  const [saldo, setSaldo] = useState(valorParaCampo(inicial.saldo_inicial ?? 0))
  const [cor, setCor] = useState(inicial.cor || CORES[0])
  const [ativa, setAtiva] = useState(inicial.ativa ?? true)
  const [erro, setErro] = useState(null)

  async function salvar() {
    if (!nome.trim()) return setErro('Dê um nome para a conta.')
    const s = saldo === '' ? 0 : lerValor(saldo.replace(/^-/, '')) * (saldo.trim().startsWith('-') ? -1 : 1)
    if (Number.isNaN(s)) return setErro('Saldo inicial inválido.')
    const dados = { nome: nome.trim(), tipo, saldo_inicial: s, cor, ativa }
    const r = inicial.id ? await supabase.from('contas').update(dados).eq('id', inicial.id) : await supabase.from('contas').insert(dados)
    if (r.error) setErro(r.error.message); else salvou()
  }
  async function excluir() {
    if (!window.confirm('Excluir esta conta? Só é possível se ela não tiver lançamentos. Se tiver, desative-a em vez disso.')) return
    const r = await supabase.from('contas').delete().eq('id', inicial.id)
    if (r.error) setErro('Esta conta tem lançamentos. Desative-a para escondê-la sem perder o histórico.'); else salvou()
  }
  return (
    <Folha titulo={inicial.id ? 'Editar conta' : 'Nova conta'} fechar={fechar} rodape={<>{erro && <p className="aviso erro">{erro}</p>}<button className="primario" onClick={salvar}>Salvar conta</button></>}>
      <label className="campo">Nome<input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Nubank, Itaú, Carteira" autoFocus /></label>
      <label className="campo">Tipo
        <select value={tipo} onChange={e => setTipo(e.target.value)}>{TIPOS_CONTA.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select>
      </label>
      <label className="campo">Saldo inicial
        <input inputMode="decimal" value={saldo} onChange={e => setSaldo(e.target.value)} />
        <small className="sutil">Quanto havia na conta antes de começar a usar o app. Use sinal de menos para saldo negativo.</small>
      </label>
      <div className="campo"><span>Cor</span><EscolhaCor valor={cor} mudar={setCor} /></div>
      {inicial.id && (
        <label className="alternar"><input type="checkbox" checked={ativa} onChange={e => setAtiva(e.target.checked)} /><span className="trilho" aria-hidden="true" /><span>Conta ativa</span></label>
      )}
      {inicial.id && <div className="acoes-excluir"><button className="perigo" onClick={excluir}>Excluir conta</button></div>}
    </Folha>
  )
}

function FormCategoria({ inicial, fechar, salvou }) {
  const [nome, setNome] = useState(inicial.nome || '')
  const [tipo, setTipo] = useState(inicial.tipo || 'despesa')
  const [icone, setIcone] = useState(inicial.icone || '📌')
  const [cor, setCor] = useState(inicial.cor || CORES[0])
  const [ativa, setAtiva] = useState(inicial.ativa ?? true)
  const [erro, setErro] = useState(null)

  async function salvar() {
    if (!nome.trim()) return setErro('Dê um nome para a categoria.')
    const dados = { nome: nome.trim(), tipo, icone: icone.trim() || '•', cor, ativa }
    const r = inicial.id ? await supabase.from('categorias').update(dados).eq('id', inicial.id) : await supabase.from('categorias').insert(dados)
    if (r.error) setErro(r.error.code === '23505' ? 'Já existe uma categoria com esse nome.' : r.error.message); else salvou()
  }
  async function excluir() {
    if (!window.confirm('Excluir esta categoria? Os lançamentos dela ficarão sem categoria.')) return
    const r = await supabase.from('categorias').delete().eq('id', inicial.id)
    if (r.error) setErro(r.error.message); else salvou()
  }
  return (
    <Folha titulo={inicial.id ? 'Editar categoria' : 'Nova categoria'} fechar={fechar} rodape={<>{erro && <p className="aviso erro">{erro}</p>}<button className="primario" onClick={salvar}>Salvar categoria</button></>}>
      {!inicial.id && (
        <div className="segmentos">
          <button className={tipo === 'despesa' ? 'ativo' : ''} onClick={() => setTipo('despesa')}>Despesa</button>
          <button className={tipo === 'receita' ? 'ativo' : ''} onClick={() => setTipo('receita')}>Receita</button>
        </div>
      )}
      <div className="linha-icone">
        <label className="campo icone-campo">Ícone<input value={icone} onChange={e => setIcone([...e.target.value].slice(-2).join(''))} aria-label="Ícone (emoji)" /></label>
        <label className="campo">Nome<input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Pets, Academia" autoFocus /></label>
      </div>
      <small className="sutil">Toque no ícone e escolha um emoji do teclado.</small>
      <div className="campo"><span>Cor</span><EscolhaCor valor={cor} mudar={setCor} /></div>
      {inicial.id && (
        <label className="alternar"><input type="checkbox" checked={ativa} onChange={e => setAtiva(e.target.checked)} /><span className="trilho" aria-hidden="true" /><span>Mostrar ao lançar</span></label>
      )}
      {inicial.id && <div className="acoes-excluir"><button className="perigo" onClick={excluir}>Excluir categoria</button></div>}
    </Folha>
  )
}

export default function Ajustes({ contas, categorias, atualizar, tema, setTema, email }) {
  const [formConta, setFormConta] = useState(null)
  const [formCat, setFormCat] = useState(null)
  const [tipoCat, setTipoCat] = useState('despesa')

  return (
    <section className="pagina">
      <header className="pagina-topo"><h1>Ajustes</h1></header>

      <div className="bloco">
        <header className="bloco-topo"><h2>Contas</h2><button className="link" onClick={() => setFormConta({})}>Nova conta</button></header>
        <ul className="lista-contas clicavel">
          {contas.map(c => (
            <li key={c.id} onClick={() => setFormConta(c)} className={c.ativa ? '' : 'inativa'}>
              <span className="marca-cor" style={{ background: c.cor }} />
              <span className="conta-nome">{c.nome}<small>{c.ativa ? `Saldo ${moeda(c.saldo_atual)}` : 'Desativada'}</small></span>
            </li>
          ))}
        </ul>
      </div>

      <div className="bloco">
        <header className="bloco-topo"><h2>Categorias</h2><button className="link" onClick={() => setFormCat({ tipo: tipoCat })}>Nova categoria</button></header>
        <div className="segmentos pequeno">
          <button className={tipoCat === 'despesa' ? 'ativo' : ''} onClick={() => setTipoCat('despesa')}>Despesas</button>
          <button className={tipoCat === 'receita' ? 'ativo' : ''} onClick={() => setTipoCat('receita')}>Receitas</button>
        </div>
        <div className="chips">
          {categorias.filter(c => c.tipo === tipoCat).map(c => (
            <button key={c.id} className={`chip ${c.ativa ? '' : 'inativa'}`} style={{ '--cor': c.cor }} onClick={() => setFormCat(c)}>
              <span aria-hidden="true">{c.icone}</span>{c.nome}
            </button>
          ))}
        </div>
      </div>

      <div className="bloco">
        <header className="bloco-topo"><h2>Aparência</h2></header>
        <div className="segmentos">
          {[['auto', 'Automático'], ['claro', 'Claro'], ['escuro', 'Escuro']].map(([id, n]) => (
            <button key={id} className={tema === id ? 'ativo' : ''} onClick={() => setTema(id)}>{n}</button>
          ))}
        </div>
      </div>

      <div className="bloco">
        <header className="bloco-topo"><h2>Sua conta</h2></header>
        <p className="sutil">Conectado como {email}</p>
        <button className="secundario" onClick={() => supabase.auth.signOut()}>Sair</button>
      </div>

      {formConta && <FormConta inicial={formConta} fechar={() => setFormConta(null)} salvou={() => { setFormConta(null); atualizar() }} />}
      {formCat && <FormCategoria inicial={formCat} fechar={() => setFormCat(null)} salvou={() => { setFormCat(null); atualizar() }} />}
    </section>
  )
}
