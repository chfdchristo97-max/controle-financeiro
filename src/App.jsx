import React, { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import Login from './pages/Login.jsx'
import Resumo from './pages/Resumo.jsx'
import Lancamentos from './pages/Lancamentos.jsx'
import Ajustes from './pages/Ajustes.jsx'
import LancamentoForm from './components/LancamentoForm.jsx'
import { Icone } from './components/Icones.jsx'
import { inicioMes } from './format'

function aplicarTema(t) {
  const html = document.documentElement
  if (t === 'auto') html.removeAttribute('data-theme')
  else html.setAttribute('data-theme', t)
}

export default function App() {
  const [sessao, setSessao] = useState(undefined)
  const [aba, setAba] = useState('resumo')
  const [contas, setContas] = useState([])
  const [categorias, setCategorias] = useState([])
  const [versao, setVersao] = useState(0) // muda quando algo é salvo, para as telas recarregarem
  const [form, setForm] = useState(null) // null | {} (novo) | lançamento (editar)
  const [mes, setMes] = useState(() => inicioMes(new Date()))
  const [tema, setTema] = useState(() => { try { return localStorage.getItem('tema') || 'auto' } catch { return 'auto' } })

  useEffect(() => { aplicarTema(tema); try { localStorage.setItem('tema', tema) } catch {} }, [tema])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessao(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSessao(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const carregarBase = useCallback(async () => {
    const [c, k] = await Promise.all([
      supabase.from('v_saldos_contas').select('*').order('ordem').order('nome'),
      supabase.from('categorias').select('*').order('nome'),
    ])
    if (!c.error) setContas(c.data)
    if (!k.error) setCategorias(k.data)
  }, [])

  useEffect(() => { if (sessao) carregarBase() }, [sessao, versao, carregarBase])

  const atualizar = () => setVersao(v => v + 1)

  if (sessao === undefined) return <div className="carregando-tela"><div className="spinner" /></div>
  if (!sessao) return <Login />

  const props = { contas, categorias, versao, atualizar, mes, setMes, abrirForm: (l) => setForm(l || {}) }

  return (
    <div className="app">
      <main className="conteudo">
        {aba === 'resumo' && <Resumo {...props} irPara={setAba} />}
        {aba === 'lancamentos' && <Lancamentos {...props} />}
        {aba === 'ajustes' && <Ajustes {...props} tema={tema} setTema={setTema} email={sessao.user.email} />}
      </main>

      <nav className="barra-abas" aria-label="Navegação principal">
        <button className={aba === 'resumo' ? 'ativa' : ''} onClick={() => setAba('resumo')}>
          <Icone nome="casa" /><span>Resumo</span>
        </button>
        <button className={aba === 'lancamentos' ? 'ativa' : ''} onClick={() => setAba('lancamentos')}>
          <Icone nome="lista" /><span>Lançamentos</span>
        </button>
        <button className="botao-novo" onClick={() => setForm({})} aria-label="Novo lançamento">
          <Icone nome="mais" />
        </button>
        <button className={aba === 'ajustes' ? 'ativa' : ''} onClick={() => setAba('ajustes')}>
          <Icone nome="engrenagem" /><span>Ajustes</span>
        </button>
      </nav>

      {form && (
        <LancamentoForm
          inicial={form}
          contas={contas.filter(c => c.ativa)}
          categorias={categorias.filter(c => c.ativa)}
          fechar={() => setForm(null)}
          salvou={() => { setForm(null); atualizar() }}
        />
      )}
    </div>
  )
}
