import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test/test-utils';
import { WalletSearchHeader } from '../../components/wallet/WalletSearchHeader';
import { WalletIntelligenceView } from '../../views/WalletIntelligenceView';
import { useAppStore } from '../../store/useAppStore';
import { backendApiClient } from '../../services/api/horizon';

const MOCK_CONNECTED_ADDRESS = 'GAUA7XL5K54CC2DDGP77FJ2YBHRJLT36CPZDXWPM6MP7MANOGG77PNJU';
const MOCK_VALID_TARGET = 'GB6YM6S6NW5UDYQASFDFXHCIVLY7BEPRLYVUBXWME6K7YZKKA4VE2Q7C';

describe('STEP 5 — Wallet Intelligence Flow Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('1. "My Connected Wallet" preset button appears ONLY when wallet is connected', () => {
    // When disconnected
    const { rerender } = renderWithProviders(
      <WalletSearchHeader
        searchedAddress=""
        onSearch={vi.fn()}
        isLoading={false}
      />,
      {
        initialStoreState: {
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
        },
      }
    );

    expect(screen.queryByText(/my connected wallet/i)).not.toBeInTheDocument();

    // When connected
    useAppStore.setState({
      wallet: {
        status: 'connected',
        isConnected: true,
        publicKey: MOCK_CONNECTED_ADDRESS,
        name: 'Freighter',
        provider: 'Freighter',
        walletNetwork: 'mainnet',
        networkMismatch: false,
        balanceXLM: 100,
        error: null,
      },
    });

    rerender(
      <WalletSearchHeader
        searchedAddress=""
        onSearch={vi.fn()}
        isLoading={false}
      />
    );

    expect(screen.getByText(/my connected wallet/i)).toBeInTheDocument();
  });

  it('2. Clicking "My Connected Wallet" triggers search with the connected Stellar address', async () => {
    const handleSearch = vi.fn();

    const { user } = renderWithProviders(
      <WalletSearchHeader
        searchedAddress=""
        onSearch={handleSearch}
        isLoading={false}
      />,
      {
        initialStoreState: {
          wallet: {
            status: 'connected',
            isConnected: true,
            publicKey: MOCK_CONNECTED_ADDRESS,
            name: 'Freighter',
            provider: 'Freighter',
            walletNetwork: 'mainnet',
            networkMismatch: false,
            balanceXLM: 100,
            error: null,
          },
        },
      }
    );

    const connectedBtn = screen.getByText(/my connected wallet/i);
    await user.click(connectedBtn);

    expect(handleSearch).toHaveBeenCalledWith(MOCK_CONNECTED_ADDRESS);
  });

  it('3. Rejects malformed wallet address with clear validation feedback', async () => {
    const handleSearch = vi.fn();

    const { user } = renderWithProviders(
      <WalletSearchHeader
        searchedAddress=""
        onSearch={handleSearch}
        isLoading={false}
      />
    );

    const input = screen.getByPlaceholderText(/enter stellar ed25519 public address/i);
    await user.clear(input);
    await user.type(input, 'G_INVALID_SHORT_ADDRESS');

    const analyzeBtn = screen.getByRole('button', { name: /analyze/i });
    await user.click(analyzeBtn);

    expect(
      screen.getByText(/invalid stellar public address\. must be a valid 56-character ed25519 public key starting with g\./i)
    ).toBeInTheDocument();
    expect(handleSearch).not.toHaveBeenCalled();
  });

  it('4. Submitting a valid 56-character address triggers onSearch successfully', async () => {
    const handleSearch = vi.fn();

    const { user } = renderWithProviders(
      <WalletSearchHeader
        searchedAddress=""
        onSearch={handleSearch}
        isLoading={false}
      />
    );

    const input = screen.getByPlaceholderText(/enter stellar ed25519 public address/i);
    await user.clear(input);
    await user.type(input, MOCK_VALID_TARGET);

    const analyzeBtn = screen.getByRole('button', { name: /analyze/i });
    await user.click(analyzeBtn);

    expect(handleSearch).toHaveBeenCalledWith(MOCK_VALID_TARGET);
    expect(screen.queryByText(/invalid stellar public address/i)).not.toBeInTheDocument();
  });

  it('5. Disconnected users are not falsely presented as connected', () => {
    renderWithProviders(<WalletSearchHeader searchedAddress="" onSearch={vi.fn()} isLoading={false} />);

    const store = useAppStore.getState();
    expect(store.wallet.isConnected).toBe(false);
    expect(store.wallet.publicKey).toBeNull();
    expect(screen.queryByText(/my connected wallet/i)).not.toBeInTheDocument();
  });

  it('6. Cached/localStorage data alone cannot produce an authenticated wallet session', () => {
    localStorage.setItem('wallet_address', MOCK_CONNECTED_ADDRESS);
    localStorage.setItem('auth_token', 'fake-jwt-token');

    renderWithProviders(<WalletSearchHeader searchedAddress="" onSearch={vi.fn()} isLoading={false} />);

    // Zustand store must remain strictly disconnected unless Freighter is actively connected
    expect(useAppStore.getState().wallet.isConnected).toBe(false);
    expect(useAppStore.getState().wallet.publicKey).toBeNull();
    expect(screen.queryByText(/my connected wallet/i)).not.toBeInTheDocument();

    localStorage.clear();
  });

  it('7. WalletIntelligenceView integration: renders analytics dashboard when search resolves', async () => {
    vi.spyOn(backendApiClient, 'getAccountAnalytics').mockResolvedValueOnce({
      summary: {
        sequence: '52918402',
        subaccountCount: 3,
        homeDomain: 'stellar.org',
        successRate: 99.4,
        totalTransactions: 42,
        activeDaysCount: 15,
      },
      balances: {
        nativeXlm: 1450.5,
        nativeAvailable: 1448.5,
        nativeReserved: 2.0,
        trustlineAssets: [],
      },
      account: {
        id: MOCK_CONNECTED_ADDRESS,
        sequence: '52918402',
        signers: [{ key: MOCK_CONNECTED_ADDRESS, weight: 1 }],
      },
      transactions: [],
      analytics: {
        dailyVolumes: [],
        counterparties: [],
      },
    } as any);

    renderWithProviders(<WalletIntelligenceView />);

    await waitFor(() => {
      expect(screen.getByText('Native XLM Balance')).toBeInTheDocument();
      expect(screen.getByText(/1,450\.50/)).toBeInTheDocument();
      expect(screen.getByText('Domain & Signers')).toBeInTheDocument();
    });
  });
});
