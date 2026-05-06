import { formatCurrency } from '../../lib/format';

function calculateEMI(loan, rate, term) {
  const monthlyRate = rate / 100 / 12;
  const months = Math.max(term * 12, 1);
  if (monthlyRate === 0) return loan / months;
  const factor = Math.pow(1 + monthlyRate, months);
  return loan * monthlyRate * factor / (factor - 1);
}

function buildRows(banks, selectedBanks, compareState) {
  return banks
    .filter((bank) => selectedBanks.has(bank.id))
    .map((bank) => {
      const emi = calculateEMI(compareState.loan, bank.rate, compareState.term);
      const totalPayment = emi * compareState.term * 12;
      const totalInterest = totalPayment - compareState.loan;
      return { ...bank, emi, totalPayment, totalInterest };
    })
    .sort((a, b) => a.rate - b.rate);
}

export default function CompareBanks({
  banks,
  compareState,
  setCompareState,
  selectedBanks,
  setSelectedBanks,
  ratePeriod,
  status,
  error,
}) {
  const rows = buildRows(banks, selectedBanks, compareState);
  const minEMI = rows.length ? Math.min(...rows.map((row) => row.emi)) : 0;

  const toggleBank = (id) => {
    setSelectedBanks((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const updateField = (field) => (event) => {
    const value = Number.isFinite(Number(event.target.value)) ? Number(event.target.value) : 0;
    setCompareState((current) => ({ ...current, [field]: value }));
  };

  return (
    <section className="panel active">
      <div className="layout">
        <div className="card">
          <div className="card-title">ข้อมูลการเปรียบเทียบ</div>
          <div className="field">
            <label htmlFor="compare-loan">วงเงินกู้</label>
            <div className="input-wrap">
              <input id="compare-loan" type="number" value={compareState.loan} onChange={updateField('loan')} />
              <span className="input-unit">บาท</span>
            </div>
          </div>
          <div className="field">
            <label htmlFor="compare-term">ระยะเวลากู้</label>
            <div className="input-wrap">
              <input id="compare-term" type="number" min="1" max="40" value={compareState.term} onChange={updateField('term')} />
              <span className="input-unit">ปี</span>
            </div>
          </div>

          <div className="divider" />
          <div className="card-title">อัตราดอกเบี้ยธนาคาร {ratePeriod.label}</div>
          <div className="compare-grid">
            {banks.length ? (
              banks.map((bank) => {
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
              })
            ) : (
              <div className="empty-state">
                <strong>{status === 'loading' ? 'กำลังโหลดอัตราดอกเบี้ยจากฐานข้อมูล' : 'ไม่มีข้อมูลอัตราดอกเบี้ย'}</strong>
                <span>{error || 'ตรวจสอบการเชื่อมต่อฐานข้อมูลและ API'}</span>
              </div>
            )}
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
                {rows.length ? (
                  rows.map((row) => (
                    <tr key={row.id} style={row.emi === minEMI ? { background: 'rgba(63,185,80,0.06)' } : undefined}>
                      <td style={{ textAlign: 'left', color: row.color, fontWeight: 500 }}>{row.name}</td>
                      <td>{row.rate}%</td>
                      <td className={row.emi === minEMI ? 'best' : ''}>{formatCurrency(row.emi)}</td>
                      <td className="interest">{formatCurrency(row.totalInterest)}</td>
                      <td>{formatCurrency(row.totalPayment)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '1.25rem' }}>
                      {status === 'loading' ? 'กำลังโหลดข้อมูลจากฐานข้อมูล...' : 'ยังไม่มีข้อมูลสำหรับเปรียบเทียบ'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="tip">
            <strong>หมายเหตุ:</strong> อัตราดอกเบี้ยจาก API ถูกจัดเก็บแบบรายไตรมาส เพื่อให้สอดคล้องกับการอัปเดตทุก 3 เดือน และสามารถเพิ่มประวัติย้อนหลังได้โดยไม่ทับข้อมูลเดิม
          </div>
        </div>
      </div>
    </section>
  );
}
