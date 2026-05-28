export function calculateMonthlyPayment(
  principal: number,
  annualRate: number,
  years: number
): { monthlyPayment: number; totalInterest: number; totalPayment: number } {
  const monthlyRate = annualRate / 100 / 12
  const numberOfPayments = years * 12

  if (monthlyRate === 0) {
    const monthlyPayment = principal / numberOfPayments
    return {
      monthlyPayment,
      totalInterest: 0,
      totalPayment: principal
    }
  }

  const monthlyPayment =
    (principal * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) /
    (Math.pow(1 + monthlyRate, numberOfPayments) - 1)

  const totalPayment = monthlyPayment * numberOfPayments
  const totalInterest = totalPayment - principal

  return {
    monthlyPayment,
    totalInterest,
    totalPayment
  }
}

export function calculateSimpleInterest(
  principal: number,
  annualRate: number,
  years: number
): { interest: number; totalAmount: number } {
  const interest = principal * (annualRate / 100) * years
  return {
    interest,
    totalAmount: principal + interest
  }
}

export function calculateCompoundInterest(
  principal: number,
  annualRate: number,
  years: number,
  compoundsPerYear: number = 1
): { interest: number; totalAmount: number } {
  const rate = annualRate / 100
  const totalAmount = principal * Math.pow(1 + rate / compoundsPerYear, compoundsPerYear * years)
  const interest = totalAmount - principal

  return {
    interest,
    totalAmount
  }
}
