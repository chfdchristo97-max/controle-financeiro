import React, { createContext, useContext } from 'react'
import { moeda } from './format'

export const Privacidade = createContext(false)

// Mostra um valor em reais, ou pontinhos quando "ocultar valores" está ligado
export function Dinheiro({ v, className, sinal = '' }) {
  const oculto = useContext(Privacidade)
  return <span className={className}>{oculto ? 'R$ ••••' : `${sinal}${moeda(v)}`}</span>
}
