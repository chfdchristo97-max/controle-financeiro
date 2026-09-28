import React, { useState } from 'react'
import { supabase } from '../supabase'

export default function Login() {
  const [modo, setModo] = useState('entrar')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [msg, setMsg] = useState(null)
  const [ocupado, setOcupado] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    setMsg(null); setOcupado(true)
    if (modo === 'entrar') {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
      if (error) setMsg({ tipo: 'erro', texto: error.message.includes('Invalid') ? 'E-mail ou senha incorretos.' : error.message.includes('not confirmed') ? 'Confirme seu e-mail antes de entrar (veja sua caixa de entrada).' : error.message })
    } else {
      if (senha.length < 8) { setMsg({ tipo: 'erro', texto: 'A senha precisa ter pelo menos 8 caracteres.' }); setOcupado(false); return }
      const { data, error } = await supabase.auth.signUp({ email, password: senha, options: { emailRedirectTo: window.location.origin } })
      if (error) setMsg({ tipo: 'erro', texto: error.message.includes('not allowed') || error.message.includes('disabled') ? 'Novos cadastros estão fechados.' : error.message })
      else if (!data.session) setMsg({ tipo: 'ok', texto: 'Conta criada. Abra o e-mail de confirmação que enviamos e toque no link; depois volte aqui e entre.' })
    }
    setOcupado(false)
  }

  return (
    <div className="login">
      <div className="login-marca">
        <img src="/icon-192.png" alt="" width="64" height="64" />
        <h1>Controle financeiro</h1>
        <p>Suas contas, gastos e metas no mesmo lugar.</p>
      </div>
      <form className="login-form" onSubmit={enviar}>
        <label>E-mail
          <input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
        </label>
        <label>Senha
          <input type="password" autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'} required value={senha} onChange={e => setSenha(e.target.value)} />
        </label>
        {msg && <p className={`aviso ${msg.tipo}`}>{msg.texto}</p>}
        <button className="primario" disabled={ocupado}>{ocupado ? 'Aguarde…' : modo === 'entrar' ? 'Entrar' : 'Criar conta'}</button>
        <button type="button" className="link" onClick={() => { setModo(modo === 'entrar' ? 'criar' : 'entrar'); setMsg(null) }}>
          {modo === 'entrar' ? 'Primeiro acesso? Criar conta' : 'Já tenho conta. Entrar'}
        </button>
      </form>
    </div>
  )
}
