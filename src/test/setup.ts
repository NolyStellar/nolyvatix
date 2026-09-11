import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { useAppStore } from '../store/useAppStore';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
window.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

// Mock IntersectionObserver
class IntersectionObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
window.IntersectionObserver = IntersectionObserverMock as unknown as typeof IntersectionObserver;

// Mock window.scrollTo
window.scrollTo = vi.fn();

// Preserve initial store snapshot
const initialStoreSnapshot = {
  theme: 'dark' as const,
  sidebarCollapsed: false,
  aiCopilotOpen: false,
  activeRoute: 'command-center' as const,
  stellarNetwork: 'mainnet' as const,
  networkTelemetry: {
    horizonStatus: 'healthy' as const,
    sorobanStatus: 'healthy' as const,
    currentLedgerSequence: 52918402,
    tps: 52.4,
    avgLedgerCloseSeconds: 4.8,
    total24hVolumeUSD: 184920000,
    activeAccounts24h: 42150,
    lastUpdated: '2026-09-08T12:00:00.000Z',
  },
  wallet: {
    status: 'disconnected' as const,
    isConnected: false,
    publicKey: null,
    name: null,
    provider: null,
    walletNetwork: null,
    networkMismatch: false,
    balanceXLM: null,
    error: null,
  },
};

beforeEach(() => {
  useAppStore.setState(initialStoreSnapshot, false);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
