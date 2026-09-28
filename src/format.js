const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
export const moeda = (v) => brl.format(Number(v) || 0)

// Aceita "1.234,56", "1234,56", "1234.56"
export function lerValor(txt) {
  if (txt === null || txt === undefined) return NaN
  let s = String(txt).trim().replace(/[R$\s]/g, '')
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  return Number(s)
}
export const valorParaCampo = (v) =>
  v === '' || v === null || v === undefined ? '' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
export const nomeMes = (d) => `${MESES[d.getMonth()]} ${d.getFullYear()}`
export const inicioMes = (d) => new Date(d.getFullYear(), d.getMonth(), 1)
export const somarMeses = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1)

// Datas no formato AAAA-MM-DD sem problemas de fuso
export const isoData = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const hojeISO = () => isoData(new Date())
export const fimMes = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0)
export function somarMesesISO(iso, n) {
  const [y, m, dd] = iso.split('-').map(Number)
  const alvo = new Date(y, m - 1 + n, 1)
  const ultimo = fimMes(alvo).getDate()
  return isoData(new Date(alvo.getFullYear(), alvo.getMonth(), Math.min(dd, ultimo)))
}
const DIAS = ['domingo','segunda','terça','quarta','quinta','sexta','sábado']
export function rotuloDia(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const hoje = hojeISO()
  const ontem = isoData(new Date(Date.now() - 864e5))
  if (iso === hoje) return 'Hoje'
  if (iso === ontem) return 'Ontem'
  return `${DIAS[dt.getDay()]}, ${d} de ${MESES[m - 1].toLowerCase()}`
}
