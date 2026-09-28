import React, { useEffect } from 'react'
import { Icone } from './Icones.jsx'

// Painel que sobe de baixo (estilo iPhone). "cheia" ocupa a tela toda no celular.
export default function Folha({ titulo, fechar, children, rodape, cheia = false }) {
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && fechar()
    document.addEventListener('keydown', esc)
    const y = window.scrollY
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', esc); document.body.style.overflow = ''; window.scrollTo(0, y) }
  }, [fechar])
  return (
    <div className="folha-fundo" onClick={fechar}>
      <div className={`folha ${cheia ? 'cheia' : ''}`} role="dialog" aria-modal="true" aria-label={titulo} onClick={e => e.stopPropagation()}>
        <header className="folha-topo">
          <button className="icone-btn" onClick={fechar} aria-label="Fechar"><Icone nome="fechar" tamanho={20} /></button>
          <h2>{titulo}</h2>
          <span className="icone-btn" aria-hidden="true" />
        </header>
        <div className="folha-corpo">{children}</div>
        {rodape && <footer className="folha-rodape">{rodape}</footer>}
      </div>
    </div>
  )
}
