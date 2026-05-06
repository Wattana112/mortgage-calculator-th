import { useEffect, useState } from 'react';
import { fallbackBanks } from '../data/banks';

export function useBankRates() {
  const [banks, setBanks] = useState(fallbackBanks);
  const [ratePeriod, setRatePeriod] = useState({
    label: 'ข้อมูลตัวอย่าง (fallback)',
    updatedAt: null,
  });
  const [rateSource, setRateSource] = useState('fallback');

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
          updatedAt: bank.updated_at,
        }));

        if (fetchedBanks.length) {
          setBanks(fetchedBanks);
          setRatePeriod({
            label: json.period?.label || 'อัตราล่าสุด',
            updatedAt: json.period?.published_at || null,
          });
          setRateSource('api');
        }
      } catch (error) {
        if (!cancelled) {
          setBanks(fallbackBanks);
          setRatePeriod({
            label: 'ข้อมูลตัวอย่าง (fallback)',
            updatedAt: null,
          });
          setRateSource('fallback');
        }
      }
    }

    loadRates();
    return () => {
      cancelled = true;
    };
  }, []);

  return { banks, ratePeriod, rateSource };
}

