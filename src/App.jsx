import React, { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import Login from './pages/Login.jsx'
import Resumo from './pages/Resumo.jsx'
import Lancamentos from './pages/Lancamentos.jsx'
import Ajustes from './pages/Ajustes.jsx'
import LancamentoForm from './components/LancamentoForm.jsx'
import { Icone } from './components/Icones.jsx'
import { Privacidade } from './privacidade.jsx'
import { inicioMes } from './format'

const ler = (k, padrao) => { try { return localStorage.getItem(k) ?? padrao } catch { return padrao } }
const gravar = (k, v) => { try { localStorage.setItem(k, v) } catch {} }

function aplicarTema(t) {
  const html = document.documentElement
  if (t === 'auto') html.removeAttribute('data-theme')
  else html.setAttribute('data-theme', t)
  const escuro = t === 'escuro' || (t === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', escuro ? '#0d0e12' : '#f2f3f5')
}

export default function App() {
  const [sessao, setSessao] = useState(undefined)
  const [aba, setAba] = useState('resumo')
  const [contas, setContas] = useState([])
  const [categorias, setCategorias] = useState([])
  const [versao, setVersao] = useState(0)
  const [form, setForm] = useState(null)
  const [mes, setMes] = useState(() => inicioMes(new Date()))
  const [tema, setTema] = useState(() => ler('cf-tema', 'escuro'))
  const [oculto, setOculto] = useState(() => ler('cf-oculto', '0') === '1')

  useEffect(() => { aplicarTema(tema); gravar('cf-tema', tema) }, [tema])
  useEffect(() => { gravar('cf-oculto', oculto ? '1' : '0') }, [oculto])

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
  const trocarAba = (a) => { setAba(a); window.scrollTo(0, 0) }

  if (sessao === undefined) return <div className="carregando-tela"><div className="spinner" /></div>
  if (!sessao) return <Login />

  const props = { contas, categorias, versao, atualizar, mes, setMes, abrirForm: (l) => setForm(l || {}) }

  return (
    <Privacidade.Provider value={oculto}>
      <div className="app">
        <main className="conteudo">
          {aba === 'resumo' && <Resumo {...props} irPara={trocarAba} oculto={oculto} setOculto={setOculto} />}
          {aba === 'lancamentos' && <Lancamentos {...props} />}
          {aba === 'ajustes' && <Ajustes {...props} tema={tema} setTema={setTema} email={sessao.user.email} />}
        </main>

        <nav className="barra-abas" aria-label="Navegação principal">
          <button className={aba === 'resumo' ? 'ativa' : ''} onClick={() => trocarAba('resumo')} aria-current={aba === 'resumo'}>
            <Icone nome="casa" /><span>Resumo</span>
          </button>
          <button className={aba === 'lancamentos' ? 'ativa' : ''} onClick={() => trocarAba('lancamentos')} aria-current={aba === 'lancamentos'}>
            <Icone nome="lista" /><span>Lançamentos</span>
          </button>
          <button className={aba === 'ajustes' ? 'ativa' : ''} onClick={() => trocarAba('ajustes')} aria-current={aba === 'ajustes'}>
            <Icone nome="engrenagem" /><span>Ajustes</span>
          </button>
          <button className="botao-novo" onClick={() => setForm({})} aria-label="Novo lançamento">
            <Icone nome="mais" />
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
    </Privacidade.Provider>
  )
}
