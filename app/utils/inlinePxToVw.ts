const idealWidth = 375
const maxDisplayWidth = 600

function round(value: number, precision = 3) {
  const ratio = 10 ** precision
  return Math.round(value * ratio) / ratio
}

export function pxToVw(value: number) {
  const vwValue = round((value * 100) / idealWidth)
  const maxValue = round((value * maxDisplayWidth) / idealWidth)

  return `min(${vwValue}vw, ${maxValue}px)`
}
