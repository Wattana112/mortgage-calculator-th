export default function AppHeader({ ratePeriod, status, error }) {
  const statusLabel =
    status === 'ready' ? 'API จริง' : status === 'loading' ? 'กำลังโหลด' : 'เชื่อมต่อไม่สำเร็จ';

  return (
    <header className="header">
      <div className="header-copy">
        <h1>คำนวณดอกเบี้ยบ้าน & รีไฟแนนซ์</h1>
        <p className="subtitle">คำนวณค่าผ่อนรายเดือน ดอกเบี้ยรวม และวิเคราะห์ความคุ้มค่าของการรีไฟแนนซ์</p>
      </div>
      <div className="source-chip">
        <span>{statusLabel}</span>
        <strong>{ratePeriod.label}</strong>
        {error ? <small>{error}</small> : null}
      </div>
    </header>
  );
}
