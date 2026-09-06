import React, { useState, useEffect } from 'react';
import { useAccountAnalytics } from '../hooks/useNetworkData';
import { WalletSearchHeader } from '../components/wallet/WalletSearchHeader';
import { WalletSummaryCards } from '../components/wallet/WalletSummaryCards';
import { BalanceAnalyticsSection } from '../components/wallet/BalanceAnalyticsSection';
import { TransactionIntelligenceSection } from '../components/wallet/TransactionIntelligenceSection';
import { ActivityTimelineSection } from '../components/wallet/ActivityTimelineSection';
import { WalletAnalyticsDashboard } from '../components/wallet/WalletAnalyticsDashboard';
import { AlertCircle, RefreshCw, Wallet } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

const DEFAULT_DEMO_ADDRESS = 'GAUA7XL5K54CC2DDGP77FJ2YBHRJLT36CPZDXWPM6MP7MANOGG77PNJU';

export const WalletIntelligenceView: React.FC = () => {
  const { wallet } = useAppStore();
  const [searchedAddress, setSearchedAddress] = useState<string>(
    wallet.isConnected && wallet.publicKey ? wallet.publicKey : DEFAULT_DEMO_ADDRESS
  );

  // If user connects or changes their wallet, automatically switch view if still on default
  useEffect(() => {
    if (wallet.isConnected && wallet.publicKey && searchedAddress === DEFAULT_DEMO_ADDRESS) {
      setSearchedAddress(wallet.publicKey);
    }
  }, [wallet.isConnected, wallet.publicKey]);

  const { data: analytics, isLoading, isError, error, refetch } = useAccountAnalytics(searchedAddress);

  const handleSearch = (newAddress: string) => {
    setSearchedAddress(newAddress);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto pb-16 select-none">
      {/* 1. Header & Search Bar */}
      <WalletSearchHeader
        searchedAddress={searchedAddress}
        onSearch={handleSearch}
        isLoading={isLoading}
      />

      {/* Loading Skeleton State */}
      {isLoading && (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-zinc-900 border border-zinc-800 rounded-xl p-4" />
            ))}
          </div>
          <div className="h-80 bg-zinc-900 border border-zinc-800 rounded-xl" />
        </div>
      )}

      {/* Error State */}
      {isError && !isLoading && (
        <div className="bg-rose-950/40 border border-rose-800/80 rounded-xl p-6 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
          <h3 className="text-base font-bold text-white">Account Fetch Error</h3>
          <p className="text-xs text-rose-300 max-w-md mx-auto font-mono">
            {error instanceof Error ? error.message : 'Failed to retrieve account details from Stellar Horizon RPC.'}
          </p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium rounded-lg inline-flex items-center gap-2 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry Request
          </button>
        </div>
      )}

      {/* Render Full Wallet Intelligence Suite */}
      {!isLoading && !isError && analytics && (
        <div className="space-y-8">
          {/* 2. Wallet Summary Cards */}
          <WalletSummaryCards analytics={analytics} />

          {/* 3. Balance & Asset Analytics */}
          <BalanceAnalyticsSection analytics={analytics} />

          {/* 4. Transaction Intelligence */}
          <TransactionIntelligenceSection analytics={analytics} />

          {/* 5. Analytics Dashboard & Counterparties */}
          <WalletAnalyticsDashboard analytics={analytics} />

          {/* 6. Interactive Activity Timeline */}
          <ActivityTimelineSection analytics={analytics} />
        </div>
      )}
    </div>
  );
};
