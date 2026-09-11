import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/test-utils';
import { AppHeader } from '../../components/layout/AppHeader';
import { AccessDeniedView } from '../../views/errors/AccessDeniedView';
import { authFetch } from '../../lib/apiClient';
import { auth } from '../../lib/firebase';
import { useAppStore } from '../../store/useAppStore';

const MOCK_WALLET_PUBKEY = 'GAUA7XL5K54CC2DDGP77FJ2YBHRJLT36CPZDXWPM6MP7MANOGG77PNJU';

describe('STEP 6 — Authentication Boundary Regression Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Connecting a Stellar Freighter wallet does NOT grant Firebase authentication', () => {
    // 1. Connect Stellar wallet in store
    useAppStore.setState({
      wallet: {
        status: 'connected',
        isConnected: true,
        publicKey: MOCK_WALLET_PUBKEY,
        name: 'Freighter',
        provider: 'Freighter',
        walletNetwork: 'mainnet',
        networkMismatch: false,
        balanceXLM: 500,
        error: null,
      },
    });

    // 2. Verify store reports wallet connected
    expect(useAppStore.getState().wallet.isConnected).toBe(true);

    // 3. Verify Firebase auth remains unauthenticated
    expect(auth.currentUser).toBeNull();
  });

  it('2. authFetch does NOT attach Bearer token when only Stellar wallet is connected', async () => {
    // Stellar wallet is connected
    useAppStore.setState({
      wallet: {
        status: 'connected',
        isConnected: true,
        publicKey: MOCK_WALLET_PUBKEY,
        name: 'Freighter',
        provider: 'Freighter',
        walletNetwork: 'mainnet',
        networkMismatch: false,
        balanceXLM: 500,
        error: null,
      },
    });

    // Mock global fetch to inspect request headers
    let capturedHeaders: Headers | undefined;
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      capturedHeaders = new Headers(init?.headers);
      return new Response(JSON.stringify({ success: true, data: [] }), { status: 200 });
    });

    await authFetch('/api/dashboards');

    // Security assertion: No Authorization header should be set
    expect(capturedHeaders?.get('Authorization')).toBeNull();
    fetchSpy.mockRestore();
  });

  it('3. authFetch attaches Bearer token ONLY when a valid Firebase user exists', async () => {
    const mockGetIdToken = vi.fn().mockResolvedValue('mock-firebase-id-token-xyz');
    const mockUser = {
      uid: 'firebase-test-uid-123',
      email: 'analyst@nolyvatix.network',
      getIdToken: mockGetIdToken,
    };

    // Temporarily mock auth.currentUser
    Object.defineProperty(auth, 'currentUser', {
      value: mockUser,
      configurable: true,
    });

    let capturedHeaders: Headers | undefined;
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      capturedHeaders = new Headers(init?.headers);
      return new Response(JSON.stringify({ success: true, data: [] }), { status: 200 });
    });

    await authFetch('/api/dashboards');

    expect(capturedHeaders?.get('Authorization')).toBe('Bearer mock-firebase-id-token-xyz');

    // Reset currentUser mock
    Object.defineProperty(auth, 'currentUser', {
      value: null,
      configurable: true,
    });
    fetchSpy.mockRestore();
  });

  it('4. AccessDeniedView clearly enforces that Stellar Web3 wallet connection is independent of tenant workspace access', () => {
    // Even when wallet is connected
    renderWithProviders(<AccessDeniedView />, {
      initialStoreState: {
        wallet: {
          status: 'connected',
          isConnected: true,
          publicKey: MOCK_WALLET_PUBKEY,
          name: 'Freighter',
          provider: 'Freighter',
          walletNetwork: 'mainnet',
          networkMismatch: false,
          balanceXLM: 100,
          error: null,
        },
      },
    });

    expect(screen.getByText(/workspace permission required/i)).toBeInTheDocument();
    expect(screen.getByText(/http 403 • access_restricted/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /stellar web3 wallet connection is independent of tenant workspace access/i
      )
    ).toBeInTheDocument();
  });

  it('5. UI displays distinct states for Web3 Wallet and Tenant Auth in Header', () => {
    renderWithProviders(<AppHeader />, {
      initialStoreState: {
        wallet: {
          status: 'connected',
          isConnected: true,
          publicKey: MOCK_WALLET_PUBKEY,
          name: 'Freighter',
          provider: 'Freighter',
          walletNetwork: 'mainnet',
          networkMismatch: false,
          balanceXLM: 100,
          error: null,
        },
      },
    });

    // Wallet is displayed via shortened Stellar address
    expect(screen.getByRole('button', { name: /GAUA\.\.\.PNJU/i })).toBeInTheDocument();

    // Tenant auth badge displays tenant auth status independently
    expect(screen.getByText('Auth: Active')).toBeInTheDocument();
  });
});
