import { buildAnnualBars, simulateFixedLoan, simulatePromoLoan } from '../../lib/mortgage';
import { formatCurrency, formatShortAmount } from '../../lib/format';

function StatBox({ label, value, tone = '' }) {
  return (
    <div className="stat-box">
      <div className="s-label">{label}</div>
      <div className={`s-val ${tone}`}>{value}</div>
    </div>
  );
}

function AnnualBars({ bars }) {
  const maxTotal = Math.max(...bars.map((item) => item.total), 1);
  return (
    <div className="bar-chart">
      {bars.map((row) => (
        <div className="bar-row" key={row.year}>
          <span className="bar-yr">ปี{row.year}</span>
          <div className="bar-track">
            <div className="bar-principal" style={{ width: `${(row.principal / maxTotal) * 100}%` }} />
            <div className="bar-interest" style={{ width: `${(row.interest / maxTotal) * 100}%` }} />
          </div>
          <span className="bar-amt">{formatShortAmount(row.total)}</span>
        </div>
      ))}
    </div>
  );
}

function ScheduleTable({ rows }) {
  return (
    <tbody>
      {rows.map((row) => (
        <tr key={row.month}>
          <td>เดือน {row.month}</td>
          <td>{formatCurrency(row.payment)}</td>
          <td className="principal">{formatCurrency(row.principal)}</td>
          <td className="interest">{formatCurrency(row.interest)}</td>
          <td>{formatCurrency(row.balance)}</td>
        </tr>
      ))}
    </tbody>
  );
}

export default function LoanCalculator({ state, setState }) {
  const loanAmount = state.price * (1 - state.downPct / 100);
  const promoMode = state.rateType === 'promo';

  const result = promoMode
    ? (() => {
        const promo = simulatePromoLoan(
          loanAmount,
          state.promoRate,
          state.promoYears,
          state.afterRate,
          state.term,
        );
        return {
          monthly: promo.totalPayment / (state.term * 12),
          loan: loanAmount,
          totalInterest: promo.totalInterest,
          totalPayment: promo.totalPayment,
          ratio: loanAmount ? (promo.totalInterest / loanAmount) * 100 : 0,
          promo,
          annualBars: buildAnnualBars(promo.rows, state.term * 12),
          scheduleRows: promo.rows
            .filter((row) => row.month === 1 || row.month % 6 === 0 || row.month % 12 === 0)
            .slice(0, 15),
        };
      })()
    : (() => {
        const fixed = simulateFixedLoan(loanAmount, state.rate, state.term);
        return {
          monthly: fixed.payment,
          loan: loanAmount,
          totalInterest: fixed.totalInterest,
          totalPayment: fixed.totalPayment,
          ratio: loanAmount ? (fixed.totalInterest / loanAmount) * 100 : 0,
          promo: null,
          annualBars: buildAnnualBars(fixed.rows, state.term * 12),
          scheduleRows: fixed.rows
            .filter((row) => row.month === 1 || row.month % 6 === 0 || row.month % 12 === 0)
            .slice(0, 15),
        };
      })();

  const updateField = (field) => (event) => {
    const raw = event.target.value;
    const value = event.target.type === 'range' || event.target.type === 'number'
      ? Number.isFinite(Number(raw)) ? Number(raw) : 0
      : raw;
    setState((current) => ({ ...current, [field]: value }));
  };

  return (
    <section className="panel active">
      <div className="layout">
        <div className="card">
          <div className="card-title">ข้อมูลสินเชื่อ</div>

          <div className="field">
            <label htmlFor="home-price">ราคาบ้าน / วงเงินกู้ <span>{formatShortAmount(state.price)} บาท</span></label>
            <div className="input-wrap">
              <input id="home-price" type="number" min="500000" max="50000000" step="100000" value={state.price} onChange={updateField('price')} />
              <span className="input-unit">บาท</span>
            </div>
            <div className="slider-wrap">
              <input type="range" min="500000" max="20000000" step="100000" value={state.price} onChange={updateField('price')} />
              <span className="slider-val">{formatShortAmount(state.price)}</span>
            </div>
          </div>

          <div className="field">
            <label htmlFor="down-pct">เงินดาวน์ <span>{state.downPct}%</span></label>
            <div className="input-wrap">
              <input id="down-pct" type="number" min="0" max="90" step="1" value={state.downPct} onChange={updateField('downPct')} />
              <span className="input-unit">%</span>
            </div>
            <div className="slider-wrap">
              <input type="range" min="0" max="50" step="1" value={state.downPct} onChange={updateField('downPct')} />
              <span className="slider-val">{state.downPct}%</span>
            </div>
          </div>

          <div className="field">
            <label htmlFor="rate">อัตราดอกเบี้ย <span>{state.rate}%/ปี</span></label>
            <div className="input-wrap">
              <input id="rate" type="number" min="0.1" max="20" step="0.1" value={state.rate} onChange={updateField('rate')} />
              <span className="input-unit">%/ปี</span>
            </div>
            <div className="slider-wrap">
              <input type="range" min="0.5" max="15" step="0.1" value={state.rate} onChange={updateField('rate')} />
              <span className="slider-val">{state.rate}%</span>
            </div>
            <div className="rate-presets">
              <span className="preset-label">อัตราอ้างอิง:</span>
              <button type="button" className="preset-btn" onClick={() => setState((current) => ({ ...current, rate: 6.5 }))}>MRR 6.5%</button>
              <button type="button" className="preset-btn" onClick={() => setState((current) => ({ ...current, rate: 5.5 }))}>MLR 5.5%</button>
              <button type="button" className="preset-btn" onClick={() => setState((current) => ({ ...current, rate: 5.05 }))}>MOR 5.05%</button>
              <button type="button" className="preset-btn" onClick={() => setState((current) => ({ ...current, rate: 3.0 }))}>Promo 3%</button>
            </div>
          </div>

          <div className="field">
            <label htmlFor="term">ระยะเวลากู้ <span>{state.term} ปี</span></label>
            <div className="input-wrap">
              <input id="term" type="number" min="1" max="40" step="1" value={state.term} onChange={updateField('term')} />
              <span className="input-unit">ปี</span>
            </div>
            <div className="slider-wrap">
              <input type="range" min="1" max="40" value={state.term} onChange={updateField('term')} />
              <span className="slider-val">{state.term}ปี</span>
            </div>
          </div>

          <div className="divider" />

          <div className="field">
            <label htmlFor="rate-type">ประเภทดอกเบี้ย</label>
            <div className="input-wrap">
              <select
                id="rate-type"
                value={state.rateType}
                onChange={(event) => setState((current) => ({ ...current, rateType: event.target.value }))}
              >
                <option value="fixed">คงที่ตลอดอายุสัญญา</option>
                <option value="promo">ช่วงโปรโมชัน + ลอยตัว</option>
              </select>
            </div>
          </div>

          {promoMode && (
            <div className="promo-fields">
              <div className="field">
                <label htmlFor="promo-rate">ดอกเบี้ยช่วงโปรโมชัน (ปีที่ 1-3) <span>{state.promoRate}%</span></label>
                <div className="input-wrap">
                  <input id="promo-rate" type="number" min="0.1" max="10" step="0.1" value={state.promoRate} onChange={updateField('promoRate')} />
                  <span className="input-unit">%</span>
                </div>
              </div>
              <div className="field">
                <label htmlFor="promo-years">ระยะเวลาโปรโมชัน</label>
                <div className="input-wrap">
                  <select
                    id="promo-years"
                    value={state.promoYears}
                    onChange={(event) => setState((current) => ({ ...current, promoYears: Number(event.target.value) }))}
                  >
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
                  <input id="promo-after" type="number" min="0.1" max="20" step="0.1" value={state.afterRate} onChange={updateField('afterRate')} />
                  <span className="input-unit">%</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="result-hero">
            <div className="result-label">ค่าผ่อนรายเดือน (เฉลี่ย)</div>
            <div className="result-big">{formatCurrency(result.monthly)}</div>
            <div className="result-sub">วงเงินกู้: {formatCurrency(result.loan)}</div>
          </div>

          <div className="stat-grid">
            <StatBox label="วงเงินกู้" value={formatCurrency(result.loan)} />
            <StatBox label="ดอกเบี้ยรวมทั้งหมด" value={formatCurrency(result.totalInterest)} tone="warn" />
            <StatBox label="ยอดรวมที่จ่ายทั้งหมด" value={formatCurrency(result.totalPayment)} />
            <StatBox label="ดอกเบี้ยต่อเงินต้น" value={`${result.ratio.toFixed(0)}%`} tone="gold" />
          </div>

          {promoMode && result.promo && (
            <div className="card promo-summary">
              <div className="card-title">ค่าผ่อนแยกตามช่วง</div>
              <div className="promo-row">
                <div>
                  <div className="promo-label">ช่วงโปรโมชัน (ปีที่ 1-{state.promoYears}) @ {state.promoRate}%</div>
                  <div className="promo-desc">ดอกเบี้ยต่ำ — ออมได้มาก</div>
                </div>
                <div className="promo-value good">{formatCurrency(result.promo.payment)}</div>
              </div>
              <div className="promo-row">
                <div>
                  <div className="promo-label">หลังโปรโมชัน (ปีที่ {state.promoYears + 1}-{state.term}) @ {state.afterRate}%</div>
                  <div className="promo-desc">ดอกเบี้ยลอยตัว — ควรรีไฟแนนซ์</div>
                </div>
                <div className="promo-value warn">{formatCurrency(result.promo.afterPayment)}</div>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-title">ตารางชำระหนี้รายปี (แบ่งเงินต้น vs ดอกเบี้ย)</div>
            <div className="legend">
              <div className="legend-item"><span className="legend-dot principal" />เงินต้น</div>
              <div className="legend-item"><span className="legend-dot interest" />ดอกเบี้ย</div>
            </div>

            <AnnualBars bars={result.annualBars} />

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
                  <ScheduleTable rows={result.scheduleRows} />
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

