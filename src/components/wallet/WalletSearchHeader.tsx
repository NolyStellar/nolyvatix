import React, { useState } from 'react';
import { Search, Wallet, ShieldCheck, Copy, Check, ExternalLink, ArrowRight, Zap } from 'lucide-react';
import { isValidStellarPublicKey } from '../../lib/stellar/walletValidator.ts';
import { truncateAddress } from '../../lib/utils.ts';
import { useAppStore } from '../../store/useAppStore.ts';

interface WalletSearchHeaderProps {
  searchedAddress: string;
  onSearch: (address: string) => void;
  isLoading: boolean;
}

// Popular Stellar public addresses for quick test/demo
const PRESET_ACCOUNTS = [
  {
    label: 'Mainnet Active Account',
    address: 'GAUA7XL5K54CC2DDGP77FJ2YBHRJLT36CPZDXWPM6MP7MANOGG77PNJU',
    tag: 'Active Ledger',
  },
  {
    label: 'Primary Horizon Hub',
    address: 'GB6YM6S6NW5UDYQASFDFXHCIVLY7BEPRLYVUBXWME6K7YZKKA4VE2Q7C',
    tag: 'Liquidity Hub',
  },
  {
    label: 'Anchor Gateway',
    address: 'GBLVLKGRDU66WLWY4XRORJXCC4LDZ347AQTUYBEPBABIZTVITW2OAGIP',
    tag: 'Anchor Gateway',
  },
  {
    label: 'Stellar High Volume',
    address: 'GAOO2DYIPGMLB2VI35AOSVBCGXX7R6V4YY2FLJSIUL7L6ZTI6EFFN2HL',
    tag: 'Payment Node',
  },
];

export const WalletSearchHeader: React.FC<WalletSearchHeaderProps> = ({
  searchedAddress,
  onSearch,
  isLoading,
}) => {
  const { wallet } = useAppStore();
  const [inputVal, setInputVal] = useState(searchedAddress);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  React.useEffect(() => {
    setInputVal(searchedAddress);
  }, [searchedAddress]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputVal.trim();
    if (!trimmed) {
      setErrorMsg('Please enter a Stellar account public address.');
      return;
    }
    if (!isValidStellarPublicKey(trimmed)) {
      setErrorMsg('Invalid Stellar public address. Must be a valid 56-character Ed25519 public key starting with G.');
      return;
    }
    setErrorMsg('');
    onSearch(trimmed);
  };

  const handlePresetSelect = (addr: string) => {
    setInputVal(addr);
    setErrorMsg('');
    onSearch(addr);
  };

  const handleCopy = () => {
    if (searchedAddress) {
      navigator.clipboard.writeText(searchedAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 space-y-4 shadow-xl backdrop-blur-sm">
      {/* Top Title & Active Search Badge */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              Wallet & Account Intelligence
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-sky-500/20 text-sky-400 uppercase tracking-wider">
                Sprint 4
              </span>
            </h1>
            <p className="text-xs text-zinc-400">
              Deep-dive address analytics, trustline audits, payment flows, and transaction telemetry.
            </p>
          </div>
        </div>

        {searchedAddress && (
          <div className="flex items-center gap-2 bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800 self-start md:self-auto">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-xs font-mono text-zinc-300">
              {searchedAddress.slice(0, 8)}...{searchedAddress.slice(-8)}
            </span>
            <button
              onClick={handleCopy}
              className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors"
              title="Copy Address"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <a
              href={`https://stellar.expert/explorer/public/account/${searchedAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-sky-400 transition-colors"
              title="View on StellarExpert"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>

      {/* Search Input Form */}
      <form onSubmit={handleSearchSubmit} className="relative flex items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={inputVal}
            onChange={(e) => {
              setInputVal(e.target.value);
              if (errorMsg) setErrorMsg('');
            }}
            placeholder="Enter Stellar ED25519 Public Address (G... 56 chars)"
            className="w-full pl-10 pr-24 py-2.5 bg-zinc-950 text-white placeholder-zinc-500 text-xs font-mono rounded-lg border border-zinc-800 focus:outline-none focus:border-sky-500 transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="absolute right-1.5 px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors disabled:opacity-50"
        >
          {isLoading ? (
            <span className="animate-pulse">Fetching...</span>
          ) : (
            <>
              <span>Analyze</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </form>

      {errorMsg && <p className="text-xs text-rose-400 font-mono">{errorMsg}</p>}

      {/* Quick Select Presets */}
      <div className="flex items-center gap-2 flex-wrap pt-1">
        <span className="text-[11px] text-zinc-500 font-mono flex items-center gap-1">
          <Zap className="w-3 h-3 text-amber-400" /> Quick Accounts:
        </span>
        {wallet.isConnected && wallet.publicKey && (
          <button
            onClick={() => handlePresetSelect(wallet.publicKey!)}
            className="px-2.5 py-1 bg-sky-950/60 hover:bg-sky-900/60 border border-sky-600/50 rounded-md text-[11px] text-sky-200 hover:text-white transition-all flex items-center gap-1.5 font-mono"
            title="Inspect my connected Freighter wallet account"
          >
            <Wallet className="w-3 h-3 text-sky-400" />
            <span className="font-semibold">My Connected Wallet</span>
            <span className="text-[9px] text-sky-400">({truncateAddress(wallet.publicKey, 4, 4)})</span>
          </button>
        )}
        {PRESET_ACCOUNTS.map((acc) => (
          <button
            key={acc.address}
            onClick={() => handlePresetSelect(acc.address)}
            className="px-2.5 py-1 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded-md text-[11px] text-zinc-300 hover:text-white transition-all flex items-center gap-1.5"
          >
            <span className="font-medium">{acc.label}</span>
            <span className="px-1 py-0.2 bg-zinc-800 rounded text-[9px] text-zinc-400 font-mono">
              {acc.tag}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
