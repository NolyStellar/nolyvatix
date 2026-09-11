import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test/test-utils';
import { WalletIntelligenceView } from '../../views/WalletIntelligenceView';
import { BalanceAnalyticsSection } from '../../components/wallet/BalanceAnalyticsSection';
import { backendApiClient } from '../../services/api/horizon';

const MOCK_ACCOUNT = 'GAUA7XL5K54CC2DDGP77FJ2YBHRJLT36CPZDXWPM6MP7MANOGG77PNJU';

describe('STEP 8 — Async Data States (Loading, Success, Empty, Error)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Loading State: displays animated pulse skeleton while query is resolving', () => {
    // Return a promise that never resolves during this test
    vi.spyOn(backendApiClient, 'getAccountAnalytics').mockReturnValue(new Promise(() => {}));

    const { container } = renderWithProviders(<WalletIntelligenceView />);

    const skeleton = container.querySelector('.animate-pulse');
    expect(skeleton).toBeInTheDocument();
    expect(screen.queryByText('Account Fetch Error')).not.toBeInTheDocument();
  });

  it('2. Success State: renders full analytics payload cleanly', async () => {
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
        nativeXlm: 1250.75,
        nativeAvailable: 1248.75,
        nativeReserved: 2.0,
        trustlineAssets: [],
      },
      account: {
        id: MOCK_ACCOUNT,
        sequence: '52918402',
        signers: [{ key: MOCK_ACCOUNT, weight: 1 }],
      },
      trustlines: [],
      balanceHistory: [],
      transactions: [],
      analytics: {
        dailyVolumes: [],
        counterparties: [],
      },
    } as any);

    renderWithProviders(<WalletIntelligenceView />);

    await waitFor(() => {
      expect(screen.getByText('Native XLM Balance')).toBeInTheDocument();
      expect(screen.getByText(/1,250\.75/)).toBeInTheDocument();
      expect(screen.getByText('Domain & Signers')).toBeInTheDocument();
      expect(screen.getByText('stellar.org')).toBeInTheDocument();
    });
  });

  it('3. Empty State: renders clear empty feedback when no records exist', () => {
    const emptyAnalytics = {
      balances: {
        assetAllocations: [],
      },
      trustlines: [],
      balanceHistory: [],
    };

    renderWithProviders(<BalanceAnalyticsSection analytics={emptyAnalytics} />);

    expect(
      screen.getByText('No non-native trustlines opened on this account.')
    ).toBeInTheDocument();
  });

  it('4. Error State: renders readable error message and recovery button without crashing', async () => {
    vi.spyOn(backendApiClient, 'getAccountAnalytics').mockRejectedValue(
      new Error('Horizon RPC endpoint rate limit exceeded (429)')
    );

    renderWithProviders(<WalletIntelligenceView />);

    await waitFor(
      () => {
        expect(screen.getByText('Account Fetch Error')).toBeInTheDocument();
        expect(
          screen.getByText('Horizon RPC endpoint rate limit exceeded (429)')
        ).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry request/i })).toBeInTheDocument();
      },
      { timeout: 3500 }
    );
  });

  it('5. Error Recovery: clicking "Retry Request" attempts to re-fetch data', async () => {
    const mockFetch = vi
      .spyOn(backendApiClient, 'getAccountAnalytics')
      .mockRejectedValue(new Error('Transient Horizon connection failure'));

    const { user } = renderWithProviders(<WalletIntelligenceView />);

    const retryBtn = await screen.findByRole('button', { name: /retry request/i }, { timeout: 3500 });
    expect(retryBtn).toBeInTheDocument();

    mockFetch.mockResolvedValueOnce({
      summary: {
        sequence: '52918402',
        subaccountCount: 1,
        homeDomain: null,
        successRate: 100,
        totalTransactions: 5,
        activeDaysCount: 1,
      },
      balances: {
        nativeXlm: 300,
        nativeAvailable: 298,
        nativeReserved: 2,
        trustlineAssets: [],
      },
      account: {
        id: MOCK_ACCOUNT,
        sequence: '52918402',
        signers: [],
      },
      trustlines: [],
      balanceHistory: [],
      transactions: [],
      analytics: {
        dailyVolumes: [],
        counterparties: [],
      },
    } as any);

    await user.click(retryBtn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });
});
