import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test/test-utils';
import { AppRouter } from '../../router/AppRouter';
import { useAppStore } from '../../store/useAppStore';

describe('STEP 7 — Routing & Screen Navigation Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.location.hash = '';
  });

  it('1. Application root mounts default Command Center view and sets hash and document title', async () => {
    renderWithProviders(<AppRouter />, {
      initialStoreState: {
        activeRoute: 'command-center',
      },
    });

    await waitFor(() => {
      expect(window.location.hash).toBe('#/command-center');
      expect(document.title).toContain('Command Center');
    });
  });

  it('2. Public analytics route: mounts AssetsCorridorsView when activeRoute is assets-corridors', async () => {
    renderWithProviders(<AppRouter />, {
      initialStoreState: {
        activeRoute: 'assets-corridors',
      },
    });

    await waitFor(() => {
      expect(window.location.hash).toBe('#/assets-corridors');
      expect(document.title).toContain('Assets & Corridors');
    });
  });

  it('3. Protected route: mounts AccessDeniedView with HTTP 403 and restricted message', async () => {
    renderWithProviders(<AppRouter />, {
      initialStoreState: {
        activeRoute: 'access-denied',
      },
    });

    await waitFor(() => {
      expect(screen.getByText(/HTTP 403 • ACCESS_RESTRICTED/i)).toBeInTheDocument();
      expect(screen.getByText(/workspace permission required/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /command center/i })).toBeInTheDocument();
    });
  });

  it('4. Unknown route fallback: mounts NotFoundView with HTTP 404 and recovery pathways', async () => {
    renderWithProviders(<AppRouter />, {
      initialStoreState: {
        activeRoute: 'not-found',
      },
    });

    await waitFor(() => {
      expect(screen.getByText(/HTTP 404 • ROUTE_NOT_FOUND/i)).toBeInTheDocument();
      expect(screen.getByText(/requested route does not exist/i)).toBeInTheDocument();
      expect(screen.getByText(/quick recovery pathways/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /return to command center/i })).toBeInTheDocument();
    });
  });

  it('5. Clicking recovery button in NotFoundView redirects user back to command-center', async () => {
    const { user } = renderWithProviders(<AppRouter />, {
      initialStoreState: {
        activeRoute: 'not-found',
      },
    });

    const returnBtn = await screen.findByRole('button', { name: /return to command center/i });
    await user.click(returnBtn);

    expect(useAppStore.getState().activeRoute).toBe('command-center');
  });

  it('6. Browser hashchange syncs route in store and mounts intended view', async () => {
    renderWithProviders(<AppRouter />, {
      initialStoreState: {
        activeRoute: 'command-center',
      },
    });

    // Simulate URL hash navigation
    window.location.hash = '#/wallet-intelligence';
    window.dispatchEvent(new HashChangeEvent('hashchange'));

    await waitFor(() => {
      expect(useAppStore.getState().activeRoute).toBe('wallet-intelligence');
      expect(document.title).toContain('Wallet Intelligence');
    });
  });
});
