import { useEffect, useMemo, useState } from 'react';
import { fallbackBanks } from './data/banks';

const currency = new Intl.NumberFormat('th-TH', {
  style: 'currency',
  currency: 'THB',
  maximumFractionDigits: 0,
});

function fmt(value) {
  return currency.format(Math.round(value || 0));
}

function fmtShort(value) {
  const n = Number(value) || 0;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${Math.round(n)}`;
}

function calcEMI(principal, annualRate, years) {
  const totalMonths = Math.max(Math.round(years * 12), 1);
  const ratePerMonth = annualRate / 100 / 12;
  if (ratePerMonth === 0) return principal / totalMonths;
  const factor = Math.pow(1 + ratePerMonth, totalMonths);
  return principal * ratePerMonth * factor / (factor - 1);
}

function simulateFixedLoan(principal, annualRate, years) {
  const months = Math.max(Math.round(years * 12), 1);
  const payment = calcEMI(principal, annualRate, years);
  const monthlyRate = annualRate / 100 / 12;
  const rows = [];
  let balance = principal;
  let totalInterest = 0;
  let totalPrincipal = 0;

  for (let month = 1; month <= months; month += 1) {
    const interest = balance * monthlyRate;
    const principalPart = Math.min(payment - interest, balance);
    balance = Math.max(balance - principalPart, 0);
    totalInterest += interest;
    totalPrincipal += principalPart;

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
    totalPrincipal,
    totalPayment: payment * months,
  };
}

function simulatePromoLoan(principal, promoRate, promoYears, afterRate, totalYears) {
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
      phase: 'promo',
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
      phase: 'after',
    });
  }

  return {
    payment: promoPayment,
    afterPayment,
    rows,
    totalInterest,
    totalPrincipal: principal - balance,
    totalPayment,
    balance,
  };
}

function buildAnnualBars(rows, totalMonths) {
  const annual = [];
  for (let year = 1; year <= Math.ceil(totalMonths / 12); year += 1) {
    const slice = rows.filter((row) => row.month > (year - 1) * 12 && row.month <= year * 12);
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

function App() {
  const [activeTab, setActiveTab] = useState('loan');
  const [bankData, setBankData] = useState(fallbackBanks);
  const [ratePeriod, setRatePeriod] = useState({ label: 'ข้อมูลตัวอย่าง (fallback)', updatedAt: null });
  const [rateSource, setRateSource] = useState('fallback');
  const [selectedBanks, setSelectedBanks] = useState(new Set([1, 2, 3, 4, 5, 6]));

  const [loanState, setLoanState] = useState({
    price: 3000000,
    downPct: 10,
    rate: 6.5,
    term: 30,
    rateType: 'promo',
    promoRate: 3.0,
    promoYears: 3,
    afterRate: 6.5,
  });

  const [refiState, setRefiState] = useState({
    remain: 2500000,
    curRate: 7.0,
    remainYr: 25,
    newRate: 5.5,
    newYr: 25,
    cost: 50000,
  });

  const [compareState, setCompareState] = useState({
    loan: 3000000,
    term: 30,
  });

  useEffect(() => {
    let cancelled = false;
    async function loadRates() {
      try {
        const res = await fetch('/api/rates.php');
        if (!res.ok) throw new Error('Request failed');
        const json = await res.json();
        if (cancelled || !json?.success) return;

        const fetchedBanks = (json.banks || []).map((bank) => ({
          id: bank.id,
          name: bank.name,
          slug: bank.slug,
          rate: Number(bank.annual_rate),
          type: bank.rate_type,
          color: bank.color || '#58A6FF',
          periodLabel: bank.period_label,
          updatedAt: bank.updated_at,
        }));

        if (fetchedBanks.length) {
          setBankData(fetchedBanks);
          setRatePeriod({
            label: json.period?.label || 'อัตราล่าสุด',
            updatedAt: json.period?.published_at || null,
          });
          setRateSource('api');
          setSelectedBanks(new Set(fetchedBanks.slice(0, 6).map((bank) => bank.id)));
        }
      } catch (error) {
        if (!cancelled) {
          setBankData(fallbackBanks);
          setRatePeriod({ label: 'ข้อมูลตัวอย่าง (fallback)', updatedAt: null });
          setRateSource('fallback');
        }
      }
    }

    loadRates();
    return () => {
      cancelled = true;
    };
  }, []);

  const loanLoan = loanState.price * (1 - loanState.downPct / 100);
  const loanResult = useMemo(() => {
    if (loanState.rateType === 'promo') {
      const promo = simulatePromoLoan(
        loanLoan,
        loanState.promoRate,
        loanState.promoYears,
        loanState.afterRate,
        loanState.term,
      );
      return {
        monthly: promo.totalPayment / (loanState.term * 12),
        loan: loanLoan,
        totalInterest: promo.totalInterest,
        totalPayment: promo.totalPayment,
        ratio: loanLoan ? (promo.totalInterest / loanLoan) * 100 : 0,
        promo,
        annualBars: buildAnnualBars(promo.rows, loanState.term * 12),
      };
    }

    const fixed = simulateFixedLoan(loanLoan, loanState.rate, loanState.term);
    return {
      monthly: fixed.payment,
      loan: loanLoan,
      totalInterest: fixed.totalInterest,
      totalPayment: fixed.totalPayment,
      ratio: loanLoan ? (fixed.totalInterest / loanLoan) * 100 : 0,
      promo: null,
      annualBars: buildAnnualBars(fixed.rows, loanState.term * 12),
      scheduleRows: fixed.rows,
    };
  }, [loanLoan, loanState]);

  const refiResult = useMemo(() => {
    const cur = simulateFixedLoan(refiState.remain, refiState.curRate, refiState.remainYr);
    const next = simulateFixedLoan(refiState.remain, refiState.newRate, refiState.newYr);
    const saveMonthly = cur.payment - next.payment;
    const saveTotal = cur.totalInterest - next.totalInterest - refiState.cost;
    const breakeven = saveMonthly > 0 ? Math.ceil(refiState.cost / saveMonthly) : null;

    let verdict = {
      tone: 'good',
      icon: '✓',
      title: 'กำลังคำนวณ...',
      tip: 'กำลังประเมินความคุ้มค่า',
    };

    if (saveMonthly <= 0) {
      verdict = {
        tone: 'warn',
        icon: '✕',
        title: 'ไม่คุ้มค่า — ดอกเบี้ยใหม่ไม่ต่ำกว่าเดิม',
        tip: 'อัตราดอกเบี้ยใหม่ไม่ช่วยลดภาระ การรีไฟแนนซ์จะไม่คุ้มเมื่อเทียบกับค่าใช้จ่าย',
      };
    } else if (breakeven > refiState.remainYr * 12) {
      verdict = {
        tone: 'warn',
        icon: '⚠',
        title: `ระยะคืนทุน ${breakeven} เดือน — นานเกินอายุสัญญาที่เหลือ`,
        tip: 'ค่าใช้จ่ายรีไฟแนนซ์สูงเกินไปเมื่อเทียบกับเวลาที่เหลือ',
      };
    } else if (breakeven <= 24) {
      verdict = {
        tone: 'good',
        icon: '✓',
        title: `คุ้มค่ามาก — คืนทุนใน ${breakeven} เดือน`,
        tip: 'จุดคืนทุนเร็ว เหมาะกับการดำเนินการรีไฟแนนซ์',
      };
    } else {
      verdict = {
        tone: 'good',
        icon: '~',
        title: `คุ้มค่าพอสมควร — คืนทุนใน ${breakeven} เดือน`,
        tip: 'คุ้มถ้าคุณวางแผนถือสัญญานานพอ',
      };
    }

    return {
      cur,
      next,
      saveMonthly,
      saveTotal,
      breakeven,
      verdict,
    };
  }, [refiState]);

  const compareRows = useMemo(() => {
    const rows = bankData
      .filter((bank) => selectedBanks.has(bank.id))
      .map((bank) => {
        const emi = calcEMI(compareState.loan, bank.rate, compareState.term);
        const totalPayment = emi * compareState.term * 12;
        const totalInterest = totalPayment - compareState.loan;
        return { ...bank, emi, totalPayment, totalInterest };
      })
      .sort((a, b) => a.rate - b.rate);

    const minEMI = rows.length ? Math.min(...rows.map((row) => row.emi)) : 0;

    return { rows, minEMI };
  }, [bankData, compareState.loan, compareState.term, selectedBanks]);

  const toggleBank = (id) => {
    setSelectedBanks((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const readNumericValue = (event) => {
    const raw = event.target.value;
    const value = Number(raw);
    return Number.isFinite(value) ? value : 0;
  };

  const updateLoanField = (field) => (event) => {
    const value = event.target.type === 'range' || event.target.type === 'number'
      ? readNumericValue(event)
      : event.target.value;
    setLoanState((current) => ({ ...current, [field]: value }));
  };

  const updateRefiField = (field) => (event) => {
    const value = readNumericValue(event);
    setRefiState((current) => ({ ...current, [field]: value }));
  };

  const updateCompareField = (field) => (event) => {
    const value = readNumericValue(event);
    setCompareState((current) => ({ ...current, [field]: value }));
  };

  return (
    <div className="app-shell">
      <div className="container">
        <header className="header">
          <div className="header-copy">
            <h1>คำนวณดอกเบี้ยบ้าน & รีไฟแนนซ์</h1>
            <p className="subtitle">คำนวณค่าผ่อนรายเดือน ดอกเบี้ยรวม และวิเคราะห์ความคุ้มค่าของการรีไฟแนนซ์</p>
          </div>
          <div className="source-chip">
            <span>Rates: {rateSource === 'api' ? 'API' : 'Fallback'}</span>
            <strong>{ratePeriod.label}</strong>
          </div>
        </header>

        <div className="tabs" role="tablist" aria-label="Mortgage calculator sections">
          <button type="button" className={`tab ${activeTab === 'loan' ? 'active' : ''}`} onClick={() => setActiveTab('loan')}>
            คำนวณสินเชื่อ
          </button>
          <button type="button" className={`tab ${activeTab === 'refi' ? 'active' : ''}`} onClick={() => setActiveTab('refi')}>
            รีไฟแนนซ์
          </button>
          <button type="button" className={`tab ${activeTab === 'compare' ? 'active' : ''}`} onClick={() => setActiveTab('compare')}>
            เปรียบเทียบธนาคาร
          </button>
        </div>

        {activeTab === 'loan' && (
          <section className="panel active">
            <div className="layout">
              <div className="card">
                <div className="card-title">ข้อมูลสินเชื่อ</div>

                <div className="field">
                  <label htmlFor="home-price">ราคาบ้าน / วงเงินกู้ <span>{fmtShort(loanState.price)} บาท</span></label>
                  <div className="input-wrap">
                    <input id="home-price" type="number" min="500000" max="50000000" step="100000" value={loanState.price} onChange={updateLoanField('price')} />
                    <span className="input-unit">บาท</span>
                  </div>
                  <div className="slider-wrap">
                    <input type="range" min="500000" max="20000000" step="100000" value={loanState.price} onChange={updateLoanField('price')} />
                    <span className="slider-val">{fmtShort(loanState.price)}</span>
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="down-pct">เงินดาวน์ <span>{loanState.downPct}%</span></label>
                  <div className="input-wrap">
                    <input id="down-pct" type="number" min="0" max="90" step="1" value={loanState.downPct} onChange={updateLoanField('downPct')} />
                    <span className="input-unit">%</span>
                  </div>
                  <div className="slider-wrap">
                    <input type="range" min="0" max="50" step="1" value={loanState.downPct} onChange={updateLoanField('downPct')} />
                    <span className="slider-val">{loanState.downPct}%</span>
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="rate">อัตราดอกเบี้ย <span>{loanState.rate}%/ปี</span></label>
                  <div className="input-wrap">
                    <input id="rate" type="number" min="0.1" max="20" step="0.1" value={loanState.rate} onChange={updateLoanField('rate')} />
                    <span className="input-unit">%/ปี</span>
                  </div>
                  <div className="slider-wrap">
                    <input type="range" min="0.5" max="15" step="0.1" value={loanState.rate} onChange={updateLoanField('rate')} />
                    <span className="slider-val">{loanState.rate}%</span>
                  </div>
                  <div className="rate-presets">
                    <span className="preset-label">อัตราอ้างอิง:</span>
                    <button type="button" className="preset-btn" onClick={() => setLoanState((current) => ({ ...current, rate: 6.5 }))}>MRR 6.5%</button>
                    <button type="button" className="preset-btn" onClick={() => setLoanState((current) => ({ ...current, rate: 5.5 }))}>MLR 5.5%</button>
                    <button type="button" className="preset-btn" onClick={() => setLoanState((current) => ({ ...current, rate: 5.05 }))}>MOR 5.05%</button>
                    <button type="button" className="preset-btn" onClick={() => setLoanState((current) => ({ ...current, rate: 3.0 }))}>Promo 3%</button>
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="term">ระยะเวลากู้ <span>{loanState.term} ปี</span></label>
                  <div className="input-wrap">
                    <input id="term" type="number" min="1" max="40" step="1" value={loanState.term} onChange={updateLoanField('term')} />
                    <span className="input-unit">ปี</span>
                  </div>
                  <div className="slider-wrap">
                    <input type="range" min="1" max="40" value={loanState.term} onChange={updateLoanField('term')} />
                    <span className="slider-val">{loanState.term}ปี</span>
                  </div>
                </div>

                <div className="divider" />

                <div className="field">
                  <label htmlFor="rate-type">ประเภทดอกเบี้ย</label>
                  <div className="input-wrap">
                    <select
                      id="rate-type"
                      value={loanState.rateType}
                      onChange={(event) => setLoanState((current) => ({ ...current, rateType: event.target.value }))}
                    >
                      <option value="fixed">คงที่ตลอดอายุสัญญา</option>
                      <option value="promo">ช่วงโปรโมชัน + ลอยตัว</option>
                    </select>
                  </div>
                </div>

                {loanState.rateType === 'promo' && (
                  <div className="promo-fields">
                    <div className="field">
                      <label htmlFor="promo-rate">ดอกเบี้ยช่วงโปรโมชัน (ปีที่ 1-3) <span>{loanState.promoRate}%</span></label>
                      <div className="input-wrap">
                        <input id="promo-rate" type="number" min="0.1" max="10" step="0.1" value={loanState.promoRate} onChange={updateLoanField('promoRate')} />
                        <span className="input-unit">%</span>
                      </div>
                    </div>
                    <div className="field">
                      <label htmlFor="promo-years">ระยะเวลาโปรโมชัน</label>
                      <div className="input-wrap">
                        <select id="promo-years" value={loanState.promoYears} onChange={(event) => setLoanState((current) => ({ ...current, promoYears: Number(event.target.value) }))}>
                          <option value="1">1 ปี</option>
                          <option value="2">2 ปี</option>
                          <option value="3">3 ปี</option>
                          <option value="4">4 ปี</option>
                          <option value="5">5 ปี</option>
                        </select>
                      </div>
                    </div>
                    <div className="field">
                      <label htmlFor="promo-after">ดอกเบี้ยหลังช่วงโปรโมชัน</label>
                      <div className="input-wrap">
                        <input id="promo-after" type="number" min="0.1" max="20" step="0.1" value={loanState.afterRate} onChange={updateLoanField('afterRate')} />
                        <span className="input-unit">%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="result-hero">
                  <div className="result-label">ค่าผ่อนรายเดือน (เฉลี่ย)</div>
                  <div className="result-big">{fmt(loanResult.monthly)}</div>
                  <div className="result-sub">วงเงินกู้: {fmt(loanResult.loan)}</div>
                </div>

                <div className="stat-grid">
                  <div className="stat-box">
                    <div className="s-label">วงเงินกู้</div>
                    <div className="s-val">{fmt(loanResult.loan)}</div>
                  </div>
                  <div className="stat-box">
                    <div className="s-label">ดอกเบี้ยรวมทั้งหมด</div>
                    <div className="s-val warn">{fmt(loanResult.totalInterest)}</div>
                  </div>
                  <div className="stat-box">
                    <div className="s-label">ยอดรวมที่จ่ายทั้งหมด</div>
                    <div className="s-val">{fmt(loanResult.totalPayment)}</div>
                  </div>
                  <div className="stat-box">
                    <div className="s-label">ดอกเบี้ยต่อเงินต้น</div>
                    <div className="s-val gold">{loanResult.ratio.toFixed(0)}%</div>
                  </div>
                </div>

                {loanState.rateType === 'promo' && loanResult.promo && (
                  <div className="card promo-summary">
                    <div className="card-title">ค่าผ่อนแยกตามช่วง</div>
                    <div className="promo-row">
                      <div>
                        <div className="promo-label">ช่วงโปรโมชัน (ปีที่ 1-{loanState.promoYears}) @ {loanState.promoRate}%</div>
                        <div className="promo-desc">ดอกเบี้ยต่ำ — ออมได้มาก</div>
                      </div>
                      <div className="promo-value good">{fmt(loanResult.promo.payment)}</div>
                    </div>
                    <div className="promo-row">
                      <div>
                        <div className="promo-label">หลังโปรโมชัน (ปีที่ {loanState.promoYears + 1}-{loanState.term}) @ {loanState.afterRate}%</div>
                        <div className="promo-desc">ดอกเบี้ยลอยตัว — ควรรีไฟแนนซ์</div>
                      </div>
                      <div className="promo-value warn">{fmt(loanResult.promo.afterPayment)}</div>
                    </div>
                  </div>
                )}

                <div className="card">
                  <div className="card-title">ตารางชำระหนี้รายปี (แบ่งเงินต้น vs ดอกเบี้ย)</div>
                  <div className="legend">
                    <div className="legend-item"><span className="legend-dot principal" />เงินต้น</div>
                    <div className="legend-item"><span className="legend-dot interest" />ดอกเบี้ย</div>
                  </div>

                  <div className="bar-chart">
                    {loanResult.annualBars.map((row) => {
                      const maxTotal = Math.max(...loanResult.annualBars.map((item) => item.total), 1);
                      return (
                        <div className="bar-row" key={row.year}>
                          <span className="bar-yr">ปี{row.year}</span>
                          <div className="bar-track">
                            <div className="bar-principal" style={{ width: `${(row.principal / maxTotal) * 100}%` }} />
                            <div className="bar-interest" style={{ width: `${(row.interest / maxTotal) * 100}%` }} />
                          </div>
                          <span className="bar-amt">{fmtShort(row.total)}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="schedule-section">
                    <div className="card-title">ตารางชำระ 5 ปีแรก</div>
                    <div className="table-wrap">
                      <table className="schedule-table">
                        <thead>
                          <tr>
                            <th>ปี/เดือน</th>
                            <th>ผ่อนรายเดือน</th>
                            <th>เงินต้น</th>
                            <th>ดอกเบี้ย</th>
                            <th>เงินต้นคงเหลือ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(loanState.rateType === 'promo' ? loanResult.promo.rows : simulateFixedLoan(loanResult.loan, loanState.rate, loanState.term).rows)
                            .filter((row) => row.month === 1 || row.month % 6 === 0 || row.month % 12 === 0)
                            .slice(0, 15)
                            .map((row) => (
                              <tr key={row.month}>
                                <td>เดือน {row.month}</td>
                                <td>{fmt(row.payment)}</td>
                                <td className="principal">{fmt(row.principal)}</td>
                                <td className="interest">{fmt(row.interest)}</td>
                                <td>{fmt(row.balance)}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'refi' && (
          <section className="panel active">
            <div className="layout">
              <div className="card">
                <div className="card-title">สินเชื่อปัจจุบัน</div>
                <div className="field">
                  <label htmlFor="remain">เงินต้นคงเหลือ</label>
                  <div className="input-wrap">
                    <input id="remain" type="number" value={refiState.remain} onChange={updateRefiField('remain')} />
                    <span className="input-unit">บาท</span>
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="curRate">อัตราดอกเบี้ยปัจจุบัน</label>
                  <div className="input-wrap">
                    <input id="curRate" type="number" min="0.1" max="20" step="0.1" value={refiState.curRate} onChange={updateRefiField('curRate')} />
                    <span className="input-unit">%/ปี</span>
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="remainYr">ระยะเวลาที่เหลือ</label>
                  <div className="input-wrap">
                    <input id="remainYr" type="number" min="1" max="40" value={refiState.remainYr} onChange={updateRefiField('remainYr')} />
                    <span className="input-unit">ปี</span>
                  </div>
                </div>

                <div className="divider" />
                <div className="card-title">สินเชื่อใหม่ (รีไฟแนนซ์)</div>

                <div className="field">
                  <label htmlFor="newRate">อัตราดอกเบี้ยใหม่</label>
                  <div className="input-wrap">
                    <input id="newRate" type="number" min="0.1" max="20" step="0.1" value={refiState.newRate} onChange={updateRefiField('newRate')} />
                    <span className="input-unit">%/ปี</span>
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="newYr">ระยะเวลาสินเชื่อใหม่</label>
                  <div className="input-wrap">
                    <input id="newYr" type="number" min="1" max="40" value={refiState.newYr} onChange={updateRefiField('newYr')} />
                    <span className="input-unit">ปี</span>
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="cost">ค่าใช้จ่ายในการรีไฟแนนซ์</label>
                  <div className="input-wrap">
                    <input id="cost" type="number" value={refiState.cost} onChange={updateRefiField('cost')} />
                    <span className="input-unit">บาท</span>
                  </div>
                  <div className="helper-text">ค่าจำนอง + ค่าประเมิน + ค่าธรรมเนียม ≈ 0.5–1% ของวงเงิน</div>
                </div>
              </div>

              <div>
                <div className={`refi-verdict ${refiResult.verdict.tone}`}>
                  <span className="icon">{refiResult.verdict.icon}</span>
                  <span>{refiResult.verdict.title}</span>
                </div>

                <div className="stat-grid">
                  <div className="stat-box">
                    <div className="s-label">ผ่อนเดือนละ (ปัจจุบัน)</div>
                    <div className="s-val warn">{fmt(refiResult.cur.payment)}</div>
                  </div>
                  <div className="stat-box">
                    <div className="s-label">ผ่อนเดือนละ (ใหม่)</div>
                    <div className="s-val good">{fmt(refiResult.next.payment)}</div>
                  </div>
                  <div className="stat-box">
                    <div className="s-label">ประหยัดต่อเดือน</div>
                    <div className="s-val gold">{fmt(Math.abs(refiResult.saveMonthly))}</div>
                  </div>
                  <div className="stat-box">
                    <div className="s-label">ประหยัดดอกเบี้ยรวม</div>
                    <div className="s-val good">{fmt(Math.abs(refiResult.saveTotal))}</div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-title">จุดคุ้มทุน (Breakeven)</div>
                  <div className="breakeven-bar">
                    <div className="breakeven-head">
                      <span>ระยะเวลาคืนทุน</span>
                      <strong>{refiResult.breakeven ? `${refiResult.breakeven} เดือน` : 'ไม่คุ้มค่า'}</strong>
                    </div>
                    <div className="breakeven-track">
                      <div className="breakeven-fill" style={{ width: `${Math.min((refiResult.breakeven || 0) / 24 * 100, 100)}%` }} />
                    </div>
                    <div className="breakeven-labels">
                      <span>0</span>
                      <span>12 เดือน</span>
                      <span>24 เดือน</span>
                    </div>
                  </div>
                  <div className="tip"><strong>คำแนะนำ:</strong> {refiResult.verdict.tip}</div>
                </div>

                <div className="card" style={{ marginTop: '1.5rem' }}>
                  <div className="card-title">เปรียบเทียบดอกเบี้ยรวม</div>
                  <div className="compare-summary">
                    <div className="compare-line">
                      <span>สัญญาปัจจุบัน</span>
                      <div className="compare-track">
                        <div className="compare-bar warn" style={{ width: `${(refiResult.cur.totalInterest / Math.max(refiResult.cur.totalInterest, refiResult.next.totalInterest)) * 100}%` }} />
                      </div>
                      <strong>{fmt(refiResult.cur.totalInterest)}</strong>
                    </div>
                    <div className="compare-line">
                      <span>หลังรีไฟแนนซ์</span>
                      <div className="compare-track">
                        <div className="compare-bar good" style={{ width: `${(refiResult.next.totalInterest / Math.max(refiResult.cur.totalInterest, refiResult.next.totalInterest)) * 100}%` }} />
                      </div>
                      <strong>{fmt(refiResult.next.totalInterest)}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'compare' && (
          <section className="panel active">
            <div className="layout">
              <div className="card">
                <div className="card-title">ข้อมูลการเปรียบเทียบ</div>
                <div className="field">
                  <label htmlFor="compare-loan">วงเงินกู้</label>
                  <div className="input-wrap">
                    <input id="compare-loan" type="number" value={compareState.loan} onChange={updateCompareField('loan')} />
                    <span className="input-unit">บาท</span>
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="compare-term">ระยะเวลากู้</label>
                  <div className="input-wrap">
                    <input id="compare-term" type="number" min="1" max="40" value={compareState.term} onChange={updateCompareField('term')} />
                    <span className="input-unit">ปี</span>
                  </div>
                </div>

                <div className="divider" />
                <div className="card-title">อัตราดอกเบี้ยธนาคาร {ratePeriod.label}</div>
                <div className="compare-grid">
                  {bankData.map((bank) => {
                    const selected = selectedBanks.has(bank.id);
                    return (
                      <button
                        type="button"
                        key={bank.id}
                        className={`compare-card ${selected ? 'selected' : ''}`}
                        onClick={() => toggleBank(bank.id)}
                      >
                        <div className="bank-name">{bank.name}</div>
                        <div className="bank-rate" style={{ color: bank.color }}>{bank.rate}%</div>
                        <div className="bank-type">{bank.type}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="card">
                <div className="card-title">ตารางเปรียบเทียบ</div>
                <div className="table-wrap compare-table-wrap">
                  <table className="schedule-table">
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left' }}>ธนาคาร</th>
                        <th>อัตรา</th>
                        <th>ผ่อน/เดือน</th>
                        <th>ดอกเบี้ยรวม</th>
                        <th>ยอดรวม</th>
                      </tr>
                    </thead>
                    <tbody>
                      {compareRows.rows.map((row) => (
                        <tr key={row.id} style={row.emi === compareRows.minEMI ? { background: 'rgba(63,185,80,0.06)' } : undefined}>
                          <td style={{ textAlign: 'left', color: row.color, fontWeight: 500 }}>{row.name}</td>
                          <td>{row.rate}%</td>
                          <td className={row.emi === compareRows.minEMI ? 'best' : ''}>{fmt(row.emi)}</td>
                          <td className="interest">{fmt(row.totalInterest)}</td>
                          <td>{fmt(row.totalPayment)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="tip">
                  <strong>หมายเหตุ:</strong> อัตราดอกเบี้ยจาก API ถูกจัดเก็บแบบรายไตรมาส เพื่อให้สอดคล้องกับการอัปเดตทุก 3 เดือน และสามารถเพิ่มประวัติย้อนหลังได้โดยไม่ทับข้อมูลเดิม
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default App;
