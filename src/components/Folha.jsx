import React, { useEffect } from 'react'
import { Icone } from './Icones.jsx'

// Painel que sobe de baixo (estilo iPhone) — no computador vira uma janela central
export default function Folha({ titulo, fechar, children, rodape }) {
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && fechar()
    document.addEventListener('keydown', esc)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', esc); document.body.style.overflow = '' }
  }, [fechar])
  return (
    <div className="folha-fundo" onClick={fechar}>
      <div className="folha" role="dialog" aria-modal="true" aria-label={titulo} onClick={e => e.stopPropagation()}>
        <header className="folha-topo">
          <h2>{titulo}</h2>
          <button className="icone-btn" onClick={fechar} aria-label="Fechar"><Icone nome="fechar" /></button>
        </header>
        <div className="folha-corpo">{children}</div>
        {rodape && <footer className="folha-rodape">{rodape}</footer>}
      </div>
    </div>
  )
}
