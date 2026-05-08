const blockedTerms = [
  '身份证号',
  '银行卡号',
  'cvv',
  '代开发票',
  '洗钱',
  '炸药制作',
  '毒品交易',
  '枪支购买',
]

const warningTerms = [
  '保本收益',
  '稳赚不赔',
  '医疗偏方',
  '快速致富',
]

export type SafetyLevel = 'safe' | 'warn' | 'block'

export function assessSafety(input: string): { level: SafetyLevel, term: string | null } {
  const normalized = input.toLowerCase()
  const blocked = blockedTerms.find(term => normalized.includes(term.toLowerCase()))
  if (blocked) return { level: 'block', term: blocked }
  const warned = warningTerms.find(term => normalized.includes(term.toLowerCase()))
  if (warned) return { level: 'warn', term: warned }
  return { level: 'safe', term: null }
}
