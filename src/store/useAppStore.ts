import { create } from 'zustand';
import { ThemeMode, StellarNetwork, NavRoute, WalletState, NetworkTelemetry } from '../types/index.ts';
import {
  connectFreighter as freighterConnect,
  fetchNativeBalance,
  getFreighterNetwork,
  FreighterWalletError,
} from '../services/wallet/freighterService.ts';

interface AppStore {
  // Theme & Layout
  theme: ThemeMode;
  sidebarCollapsed: boolean;
  aiCopilotOpen: boolean;
  activeRoute: NavRoute;

  // Blockchain Environment
  stellarNetwork: StellarNetwork;
  networkTelemetry: NetworkTelemetry;

  // Web3 Wallet State
  wallet: WalletState;

  // Actions
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setAICopilotOpen: (open: boolean) => void;
  toggleAICopilot: () => void;
  setActiveRoute: (route: NavRoute) => void;
  setStellarNetwork: (network: StellarNetwork) => void;
  setNetworkTelemetry: (telemetry: Partial<NetworkTelemetry>) => void;
  connectWallet: (provider?: 'Freighter') => Promise<void>;
  connectMockWallet: (walletName?: string) => Promise<void>;
  disconnectWallet: () => void;
  refreshWalletBalance: () => Promise<void>;
}

export const useAppStore = create<AppStore>((set, get) => ({
  // Default dark theme matching Nolyvatix / LumenIQ design specification
  theme: 'dark',
  sidebarCollapsed: false,
  aiCopilotOpen: false,
  activeRoute: 'command-center',

  stellarNetwork: 'mainnet',
  networkTelemetry: {
    horizonStatus: 'healthy',
    sorobanStatus: 'healthy',
    currentLedgerSequence: 52918402,
    tps: 52.4,
    avgLedgerCloseSeconds: 4.8,
    total24hVolumeUSD: 184920000,
    activeAccounts24h: 42150,
    lastUpdated: new Date().toISOString(),
  },

  wallet: {
    status: 'disconnected',
    isConnected: false,
    publicKey: null,
    name: null,
    provider: null,
    walletNetwork: null,
    networkMismatch: false,
    balanceXLM: null,
    error: null,
  },

  setTheme: (theme) => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
    set({ theme });
  },

  toggleTheme: () => {
    set((state) => {
      const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
      if (nextTheme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
      }
      return { theme: nextTheme };
    });
  },

  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setAICopilotOpen: (open) => set({ aiCopilotOpen: open }),
  toggleAICopilot: () => set((state) => ({ aiCopilotOpen: !state.aiCopilotOpen })),

  setActiveRoute: (activeRoute) => set({ activeRoute }),

  setStellarNetwork: (stellarNetwork) => {
    const { wallet } = get();
    let networkMismatch = false;
    let status = wallet.status;

    if (wallet.isConnected && wallet.walletNetwork) {
      networkMismatch = wallet.walletNetwork !== 'unknown' && wallet.walletNetwork !== stellarNetwork;
      status = networkMismatch ? 'network_mismatch' : 'connected';
    }

    set({
      stellarNetwork,
      wallet: {
        ...wallet,
        networkMismatch,
        status,
      },
    });

    if (wallet.isConnected && wallet.publicKey) {
      get().refreshWalletBalance();
    }
  },

  setNetworkTelemetry: (telemetry) =>
    set((state) => ({ networkTelemetry: { ...state.networkTelemetry, ...telemetry } })),

  connectWallet: async (provider: 'Freighter' = 'Freighter') => {
    const currentNetwork = get().stellarNetwork;

    set((state) => ({
      wallet: {
        ...state.wallet,
        status: 'connecting',
        error: null,
      },
    }));

    try {
      const res = await freighterConnect(currentNetwork);

      set({
        wallet: {
          status: res.networkMismatch ? 'network_mismatch' : 'connected',
          isConnected: true,
          publicKey: res.publicKey,
          name: 'Freighter',
          provider: 'Freighter',
          walletNetwork: res.network,
          networkMismatch: res.networkMismatch,
          balanceXLM: null,
          error: null,
        },
      });

      // Query real on-chain balance asynchronously
      get().refreshWalletBalance();
    } catch (err: any) {
      let status: 'unavailable' | 'rejected' | 'error' = 'error';
      if (err instanceof FreighterWalletError) {
        if (err.code === 'FREIGHTER_NOT_INSTALLED') status = 'unavailable';
        else if (err.code === 'USER_REJECTED') status = 'rejected';
      }

      set({
        wallet: {
          status,
          isConnected: false,
          publicKey: null,
          name: null,
          provider: null,
          walletNetwork: null,
          networkMismatch: false,
          balanceXLM: null,
          error: err?.message || 'Failed to connect to Freighter wallet.',
        },
      });
    }
  },

  // Alias for backward compatibility
  connectMockWallet: async (walletName?: string) => {
    return get().connectWallet('Freighter');
  },

  disconnectWallet: () => {
    set({
      wallet: {
        status: 'disconnected',
        isConnected: false,
        publicKey: null,
        name: null,
        provider: null,
        walletNetwork: null,
        networkMismatch: false,
        balanceXLM: null,
        error: null,
      },
    });
  },

  refreshWalletBalance: async () => {
    const { wallet } = get();
    if (!wallet.isConnected || !wallet.publicKey) {
      return;
    }

    try {
      const balance = await fetchNativeBalance(wallet.publicKey);
      set((state) => ({
        wallet: {
          ...state.wallet,
          balanceXLM: balance,
        },
      }));
    } catch {
      // Retain existing balance or null if network error
    }
  },
}));
