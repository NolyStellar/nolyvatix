import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test/test-utils';
import { AppHeader } from '../../components/layout/AppHeader';
import { useAppStore } from '../../store/useAppStore';
import * as freighterService from '../../services/wallet/freighterService';

const MOCK_STELLAR_PUBKEY = 'GAUA7XL5K54CC2DDGP77FJ2YBHRJLT36CPZDXWPM6MP7MANOGG77PNJU';

describe('STEP 4 — Wallet UI Component & Integration Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Disconnected: shows "Connect Wallet" button and opens connection modal', async () => {
    const { user } = renderWithProviders(<AppHeader />, {
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
    });

    const connectBtn = screen.getByRole('button', { name: /connect wallet/i });
    expect(connectBtn).toBeInTheDocument();

    await user.click(connectBtn);

    expect(screen.getByText('Stellar Web3 Wallet')).toBeInTheDocument();
    expect(screen.getByText('Freighter Wallet')).toBeInTheDocument();
    expect(screen.getByText('Supported')).toBeInTheDocument();
  });

  it('2. Connecting: displays pending/loading state with disabled button', () => {
    renderWithProviders(<AppHeader />, {
      initialStoreState: {
        wallet: {
          status: 'connecting',
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
    });

    const connectingBtn = screen.getByRole('button', { name: /connecting\.\.\./i });
    expect(connectingBtn).toBeInTheDocument();
    expect(connectingBtn).toBeDisabled();
  });

  it('3. Connected: displays shortened address and details in modal', async () => {
    const { user } = renderWithProviders(<AppHeader />, {
      initialStoreState: {
        wallet: {
          status: 'connected',
          isConnected: true,
          publicKey: MOCK_STELLAR_PUBKEY,
          name: 'Freighter',
          provider: 'Freighter',
          walletNetwork: 'mainnet',
          networkMismatch: false,
          balanceXLM: 125.45,
          error: null,
        },
      },
    });

    const connectedBtn = screen.getByRole('button', { name: /GAUA\.\.\.PNJU/i });
    expect(connectedBtn).toBeInTheDocument();

    await user.click(connectedBtn);

    expect(screen.getByText('Stellar Web3 Wallet')).toBeInTheDocument();
    expect(screen.getByText('Freighter')).toBeInTheDocument();
    expect(screen.getByText('MAINNET')).toBeInTheDocument();
    expect(screen.getByText('125.4500 XLM')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /disconnect wallet/i })).toBeInTheDocument();
  });

  it('4. Freighter Unavailable: shows extension missing alert with download link', async () => {
    const { user } = renderWithProviders(<AppHeader />, {
      initialStoreState: {
        wallet: {
          status: 'unavailable',
          isConnected: false,
          publicKey: null,
          name: null,
          provider: null,
          walletNetwork: null,
          networkMismatch: false,
          balanceXLM: null,
          error: 'Freighter extension was not detected in this browser.',
        },
      },
    });

    const connectBtn = screen.getByRole('button', { name: /connect wallet/i });
    await user.click(connectBtn);

    expect(screen.getByText(/freighter not detected/i)).toBeInTheDocument();
    const downloadLink = screen.getByRole('link', { name: /download freighter extension/i });
    expect(downloadLink).toHaveAttribute('href', 'https://www.freighter.app/');
  });

  it('5. User Rejection: displays connection declined without crashing UI', async () => {
    const { user } = renderWithProviders(<AppHeader />, {
      initialStoreState: {
        wallet: {
          status: 'rejected',
          isConnected: false,
          publicKey: null,
          name: null,
          provider: null,
          walletNetwork: null,
          networkMismatch: false,
          balanceXLM: null,
          error: 'Connection request was declined by the user in Freighter.',
        },
      },
    });

    const connectBtn = screen.getByRole('button', { name: /connect wallet/i });
    await user.click(connectBtn);

    expect(screen.getByText(/connection declined/i)).toBeInTheDocument();
    expect(screen.getByText(/access request was declined in freighter/i)).toBeInTheDocument();
  });

  it('6. Network Mismatch: visibly communicates Mainnet/Testnet mismatch', async () => {
    const { user } = renderWithProviders(<AppHeader />, {
      initialStoreState: {
        stellarNetwork: 'mainnet',
        wallet: {
          status: 'network_mismatch',
          isConnected: true,
          publicKey: MOCK_STELLAR_PUBKEY,
          name: 'Freighter',
          provider: 'Freighter',
          walletNetwork: 'testnet',
          networkMismatch: true,
          balanceXLM: 10,
          error: null,
        },
      },
    });

    const mismatchBtn = screen.getByTitle('Network Mismatch Warning');
    expect(mismatchBtn).toBeInTheDocument();

    await user.click(mismatchBtn);

    expect(screen.getByText('Network Mismatch')).toBeInTheDocument();
    expect(screen.getByText(/freighter is on/i)).toBeInTheDocument();
  });

  it('7. Disconnect: clicking disconnect resets store and UI returns to disconnected', async () => {
    const { user } = renderWithProviders(<AppHeader />, {
      initialStoreState: {
        wallet: {
          status: 'connected',
          isConnected: true,
          publicKey: MOCK_STELLAR_PUBKEY,
          name: 'Freighter',
          provider: 'Freighter',
          walletNetwork: 'mainnet',
          networkMismatch: false,
          balanceXLM: 50,
          error: null,
        },
      },
    });

    const walletTrigger = screen.getByRole('button', { name: /GAUA\.\.\.PNJU/i });
    await user.click(walletTrigger);

    const disconnectBtn = screen.getByRole('button', { name: /disconnect wallet/i });
    await user.click(disconnectBtn);

    expect(useAppStore.getState().wallet.isConnected).toBe(false);
    expect(useAppStore.getState().wallet.publicKey).toBeNull();
    const connectBtns = screen.getAllByRole('button', { name: /connect wallet/i });
    expect(connectBtns.length).toBeGreaterThan(0);
  });

  it('8. Mocked Interactive Connect Flow: connects smoothly without extension installed', async () => {
    vi.spyOn(freighterService, 'connectFreighter').mockResolvedValueOnce({
      publicKey: MOCK_STELLAR_PUBKEY,
      network: 'mainnet',
      networkMismatch: false,
    });
    vi.spyOn(freighterService, 'fetchNativeBalance').mockResolvedValueOnce(250.75);

    const { user } = renderWithProviders(<AppHeader />);

    const connectBtn = screen.getByRole('button', { name: /connect wallet/i });
    await user.click(connectBtn);

    const freighterOption = screen.getByRole('button', { name: /freighter wallet/i });
    await user.click(freighterOption);

    await waitFor(() => {
      expect(useAppStore.getState().wallet.isConnected).toBe(true);
      expect(useAppStore.getState().wallet.publicKey).toBe(MOCK_STELLAR_PUBKEY);
    });
  });
});
