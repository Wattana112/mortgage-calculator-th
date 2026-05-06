export default function TabBar({ activeTab, onChange }) {
  const tabs = [
    { id: 'loan', label: 'คำนวณสินเชื่อ' },
    { id: 'refi', label: 'รีไฟแนนซ์' },
    { id: 'compare', label: 'เปรียบเทียบธนาคาร' },
  ];

  return (
    <div className="tabs" role="tablist" aria-label="Mortgage calculator sections">
      {tabs.map((tab) => (
        <button
          type="button"
          key={tab.id}
          className={`tab ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

