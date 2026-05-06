import { useState } from 'react';
import AppHeader from './components/AppHeader';
import TabBar from './components/TabBar';
import LoanCalculator from './features/loan/LoanCalculator';
import RefiCalculator from './features/refi/RefiCalculator';
import CompareBanks from './features/compare/CompareBanks';
import { useBankRates } from './hooks/useBankRates';

function App() {
  const [activeTab, setActiveTab] = useState('loan');
  const { banks, ratePeriod, rateSource } = useBankRates();
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

  return (
    <div className="app-shell">
      <div className="container">
        <AppHeader ratePeriod={ratePeriod} rateSource={rateSource} />
        <TabBar activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === 'loan' && <LoanCalculator state={loanState} setState={setLoanState} />}
        {activeTab === 'refi' && <RefiCalculator state={refiState} setState={setRefiState} />}
        {activeTab === 'compare' && (
          <CompareBanks
            banks={banks}
            compareState={compareState}
            setCompareState={setCompareState}
            selectedBanks={selectedBanks}
            setSelectedBanks={setSelectedBanks}
            ratePeriod={ratePeriod}
          />
        )}
      </div>
    </div>
  );
}

export default App;
