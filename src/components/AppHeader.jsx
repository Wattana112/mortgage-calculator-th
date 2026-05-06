export default function AppHeader({ ratePeriod, rateSource }) {
  return (
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
  );
}

