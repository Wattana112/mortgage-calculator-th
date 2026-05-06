export function calcEMI(principal, annualRate, years) {
  const totalMonths = Math.max(Math.round(years * 12), 1);
  const ratePerMonth = annualRate / 100 / 12;
  if (ratePerMonth === 0) return principal / totalMonths;
  const factor = Math.pow(1 + ratePerMonth, totalMonths);
  return (principal * ratePerMonth * factor) / (factor - 1);
}

export function simulateFixedLoan(principal, annualRate, years) {
  const months = Math.max(Math.round(years * 12), 1);
  const payment = calcEMI(principal, annualRate, years);
  const monthlyRate = annualRate / 100 / 12;
  const rows = [];
  let balance = principal;
  let totalInterest = 0;

  for (let month = 1; month <= months; month += 1) {
    const interest = balance * monthlyRate;
    const principalPart = Math.min(payment - interest, balance);
    balance = Math.max(balance - principalPart, 0);
    totalInterest += interest;
    rows.push({
      month,
      payment,
      interest,
      principal: principalPart,
      balance,
    });
  }

  return {
    payment,
    rows,
    totalInterest,
    totalPayment: payment * months,
  };
}

export function simulatePromoLoan(principal, promoRate, promoYears, afterRate, totalYears) {
  const totalMonths = Math.max(Math.round(totalYears * 12), 1);
  const promoMonths = Math.min(Math.max(Math.round(promoYears * 12), 1), totalMonths);
  const promoPayment = calcEMI(principal, promoRate, totalYears);
  const promoMonthlyRate = promoRate / 100 / 12;

  let balance = principal;
  const rows = [];
  let totalInterest = 0;
  let totalPayment = 0;

  for (let month = 1; month <= promoMonths; month += 1) {
    const interest = balance * promoMonthlyRate;
    const principalPart = Math.min(promoPayment - interest, balance);
    balance = Math.max(balance - principalPart, 0);
    totalInterest += interest;
    totalPayment += promoPayment;
    rows.push({
      month,
      payment: promoPayment,
      interest,
      principal: principalPart,
      balance,
    });
  }

  const remainingMonths = Math.max(totalMonths - promoMonths, 0);
  const afterPayment = remainingMonths > 0 ? calcEMI(balance, afterRate, remainingMonths / 12) : 0;
  const afterMonthlyRate = afterRate / 100 / 12;

  for (let month = promoMonths + 1; month <= totalMonths; month += 1) {
    const interest = balance * afterMonthlyRate;
    const principalPart = Math.min(afterPayment - interest, balance);
    balance = Math.max(balance - principalPart, 0);
    totalInterest += interest;
    totalPayment += afterPayment;
    rows.push({
      month,
      payment: afterPayment,
      interest,
      principal: principalPart,
      balance,
    });
  }

  return {
    payment: promoPayment,
    afterPayment,
    rows,
    totalInterest,
    totalPayment,
  };
}

export function buildAnnualBars(rows, totalMonths) {
  const annual = [];
  for (let year = 1; year <= Math.ceil(totalMonths / 12); year += 1) {
    const slice = rows.filter(
      (row) => row.month > (year - 1) * 12 && row.month <= year * 12,
    );
    if (!slice.length) continue;
    annual.push({
      year,
      principal: slice.reduce((sum, row) => sum + row.principal, 0),
      interest: slice.reduce((sum, row) => sum + row.interest, 0),
      total: slice.reduce((sum, row) => sum + row.payment, 0),
    });
  }
  return annual;
}

