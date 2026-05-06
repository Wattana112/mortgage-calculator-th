import { formatCurrency } from '../../lib/format';
import { simulateFixedLoan } from '../../lib/mortgage';

function StatBox({ label, value, tone = '' }) {
  return (
    <div className="stat-box">
      <div className="s-label">{label}</div>
      <div className={`s-val ${tone}`}>{value}</div>
    </div>
  );
}

export default function RefiCalculator({ state, setState }) {
  const current = simulateFixedLoan(state.remain, state.curRate, state.remainYr);
  const next = simulateFixedLoan(state.remain, state.newRate, state.newYr);
  const saveMonthly = current.payment - next.payment;
  const saveTotal = current.totalInterest - next.totalInterest - state.cost;
  const breakeven = saveMonthly > 0 ? Math.ceil(state.cost / saveMonthly) : null;

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
  } else if (breakeven > state.remainYr * 12) {
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

  const updateField = (field) => (event) => {
    const value = Number.isFinite(Number(event.target.value)) ? Number(event.target.value) : 0;
    setState((current) => ({ ...current, [field]: value }));
  };

  return (
    <section className="panel active">
      <div className="layout">
        <div className="card">
          <div className="card-title">สินเชื่อปัจจุบัน</div>

          <div className="field">
            <label htmlFor="remain">เงินต้นคงเหลือ</label>
            <div className="input-wrap">
              <input id="remain" type="number" value={state.remain} onChange={updateField('remain')} />
              <span className="input-unit">บาท</span>
            </div>
          </div>

          <div className="field">
            <label htmlFor="curRate">อัตราดอกเบี้ยปัจจุบัน</label>
            <div className="input-wrap">
              <input id="curRate" type="number" min="0.1" max="20" step="0.1" value={state.curRate} onChange={updateField('curRate')} />
              <span className="input-unit">%/ปี</span>
            </div>
          </div>

          <div className="field">
            <label htmlFor="remainYr">ระยะเวลาที่เหลือ</label>
            <div className="input-wrap">
              <input id="remainYr" type="number" min="1" max="40" value={state.remainYr} onChange={updateField('remainYr')} />
              <span className="input-unit">ปี</span>
            </div>
          </div>

          <div className="divider" />
          <div className="card-title">สินเชื่อใหม่ (รีไฟแนนซ์)</div>

          <div className="field">
            <label htmlFor="newRate">อัตราดอกเบี้ยใหม่</label>
            <div className="input-wrap">
              <input id="newRate" type="number" min="0.1" max="20" step="0.1" value={state.newRate} onChange={updateField('newRate')} />
              <span className="input-unit">%/ปี</span>
            </div>
          </div>

          <div className="field">
            <label htmlFor="newYr">ระยะเวลาสินเชื่อใหม่</label>
            <div className="input-wrap">
              <input id="newYr" type="number" min="1" max="40" value={state.newYr} onChange={updateField('newYr')} />
              <span className="input-unit">ปี</span>
            </div>
          </div>

          <div className="field">
            <label htmlFor="cost">ค่าใช้จ่ายในการรีไฟแนนซ์</label>
            <div className="input-wrap">
              <input id="cost" type="number" value={state.cost} onChange={updateField('cost')} />
              <span className="input-unit">บาท</span>
            </div>
            <div className="helper-text">ค่าจำนอง + ค่าประเมิน + ค่าธรรมเนียม ≈ 0.5–1% ของวงเงิน</div>
          </div>
        </div>

        <div>
          <div className={`refi-verdict ${verdict.tone}`}>
            <span className="icon">{verdict.icon}</span>
            <span>{verdict.title}</span>
          </div>

          <div className="stat-grid">
            <StatBox label="ผ่อนเดือนละ (ปัจจุบัน)" value={formatCurrency(current.payment)} tone="warn" />
            <StatBox label="ผ่อนเดือนละ (ใหม่)" value={formatCurrency(next.payment)} tone="good" />
            <StatBox label="ประหยัดต่อเดือน" value={formatCurrency(Math.abs(saveMonthly))} tone="gold" />
            <StatBox label="ประหยัดดอกเบี้ยรวม" value={formatCurrency(Math.abs(saveTotal))} tone="good" />
          </div>

          <div className="card">
            <div className="card-title">จุดคุ้มทุน (Breakeven)</div>
            <div className="breakeven-bar">
              <div className="breakeven-head">
                <span>ระยะเวลาคืนทุน</span>
                <strong>{breakeven ? `${breakeven} เดือน` : 'ไม่คุ้มค่า'}</strong>
              </div>
              <div className="breakeven-track">
                <div className="breakeven-fill" style={{ width: `${Math.min((breakeven || 0) / 24 * 100, 100)}%` }} />
              </div>
              <div className="breakeven-labels">
                <span>0</span>
                <span>12 เดือน</span>
                <span>24 เดือน</span>
              </div>
            </div>
            <div className="tip"><strong>คำแนะนำ:</strong> {verdict.tip}</div>
          </div>

          <div className="card" style={{ marginTop: '1.5rem' }}>
            <div className="card-title">เปรียบเทียบดอกเบี้ยรวม</div>
            <div className="compare-summary">
              <div className="compare-line">
                <span>สัญญาปัจจุบัน</span>
                <div className="compare-track">
                  <div
                    className="compare-bar warn"
                    style={{ width: `${(current.totalInterest / Math.max(current.totalInterest, next.totalInterest)) * 100}%` }}
                  />
                </div>
                <strong>{formatCurrency(current.totalInterest)}</strong>
              </div>
              <div className="compare-line">
                <span>หลังรีไฟแนนซ์</span>
                <div className="compare-track">
                  <div
                    className="compare-bar good"
                    style={{ width: `${(next.totalInterest / Math.max(current.totalInterest, next.totalInterest)) * 100}%` }}
                  />
                </div>
                <strong>{formatCurrency(next.totalInterest)}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

