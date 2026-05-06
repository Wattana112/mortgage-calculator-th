import { useEffect, useState } from 'react';

export function useBankRates() {
  const [banks, setBanks] = useState([]);
  const [ratePeriod, setRatePeriod] = useState({
    label: 'กำลังโหลดข้อมูลจากฐานข้อมูล',
    updatedAt: null,
  });
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadRates() {
      try {
        const res = await fetch('/api/rates.php');
        if (!res.ok) throw new Error('Request failed');
        const json = await res.json();
        if (cancelled) return;
        if (!json?.success) {
          throw new Error(json?.message || 'No rate data found');
        }

        const fetchedBanks = (json.banks || []).map((bank) => ({
          id: bank.id,
          name: bank.name,
          slug: bank.slug,
          rate: Number(bank.annual_rate),
          type: bank.rate_type,
          color: bank.color || '#58A6FF',
          updatedAt: bank.updated_at,
        }));

        if (fetchedBanks.length) {
          setBanks(fetchedBanks);
          setRatePeriod({
            label: json.period?.label || 'อัตราล่าสุด',
            updatedAt: json.period?.published_at || null,
          });
          setStatus('ready');
          setError(null);
        }
        if (!fetchedBanks.length) {
          setBanks([]);
          setRatePeriod({
            label: json.period?.label || 'อัตราล่าสุด',
            updatedAt: json.period?.published_at || null,
          });
          setStatus('error');
          setError('ไม่พบข้อมูลอัตราดอกเบี้ยในฐานข้อมูล');
        }
      } catch (error) {
        if (!cancelled) {
          setBanks([]);
          setRatePeriod({
            label: 'เชื่อมต่อฐานข้อมูลไม่สำเร็จ',
            updatedAt: null,
          });
          setStatus('error');
          setError(error instanceof Error ? error.message : 'Unable to load rates');
        }
      }
    }

    loadRates();
    return () => {
      cancelled = true;
    };
  }, []);

  return { banks, ratePeriod, status, error };
}
