/**
 * Nolyvatix Data Engine - Real Freighter Wallet Integration Service
 * Interacts with the Freighter browser extension via @stellar/freighter-api.
 * Provides normalized error handling, address validation, and network matching.
 */

import * as freighterModule from '@stellar/freighter-api';
import { isValidStellarPublicKey } from '../../lib/stellar/walletValidator.ts';
import { StellarNetwork } from '../../types/index.ts';

// Safe resolver for Freighter methods across CJS/ESM bundlers & Node.js test runner
const freighter: any = (freighterModule as any).default || freighterModule;
const freighterIsConnected = freighter.isConnected || (freighterModule as any).isConnected;
const freighterRequestAccess = freighter.requestAccess || (freighterModule as any).requestAccess;
const freighterGetAddress = freighter.getAddress || (freighterModule as any).getAddress;
const freighterGetNetwork = freighter.getNetwork || (freighterModule as any).getNetwork;
const freighterGetNetworkDetails = freighter.getNetworkDetails || (freighterModule as any).getNetworkDetails;

export type FreighterErrorCode =
  | 'FREIGHTER_NOT_INSTALLED'
  | 'USER_REJECTED'
  | 'WALLET_LOCKED'
  | 'INVALID_ADDRESS'
  | 'NETWORK_MISMATCH'
  | 'RPC_ERROR'
  | 'UNKNOWN'
  | 'UNKNOWN_WALLET_ERROR';

export interface FreighterErrorDetails {
  code: FreighterErrorCode;
  message: string;
  originalError?: unknown;
}

export class FreighterWalletError extends Error {
  public code: FreighterErrorCode;
  public originalError?: unknown;

  constructor(details: FreighterErrorDetails) {
    super(details.message);
    this.name = 'FreighterWalletError';
    this.code = details.code;
    this.originalError = details.originalError;
  }
}

/**
 * Normalizes any error or exception thrown during Freighter interaction into a typed FreighterWalletError.
 */
export function normalizeFreighterError(err: unknown): FreighterWalletError {
  if (err instanceof FreighterWalletError) {
    return err;
  }

  const rawMsg = err instanceof Error ? err.message : String(err || '');
  const lowerMsg = rawMsg.toLowerCase();

  if (
    lowerMsg.includes('not installed') ||
    lowerMsg.includes('not detected') ||
    lowerMsg.includes('missing') ||
    lowerMsg.includes('isnotconnected')
  ) {
    return new FreighterWalletError({
      code: 'FREIGHTER_NOT_INSTALLED',
      message: 'Freighter extension was not detected in this browser.',
      originalError: err,
    });
  }

  if (
    lowerMsg.includes('user rejected') ||
    lowerMsg.includes('declined') ||
    lowerMsg.includes('denied') ||
    lowerMsg.includes('closed') ||
    lowerMsg.includes('canceled') ||
    lowerMsg.includes('cancelled')
  ) {
    return new FreighterWalletError({
      code: 'USER_REJECTED',
      message: 'Connection request was declined by the user in Freighter.',
      originalError: err,
    });
  }

  if (lowerMsg.includes('locked') || lowerMsg.includes('unlock')) {
    return new FreighterWalletError({
      code: 'WALLET_LOCKED',
      message: 'Freighter wallet is locked. Please unlock the extension and try again.',
      originalError: err,
    });
  }

  return new FreighterWalletError({
    code: 'UNKNOWN_WALLET_ERROR',
    message: rawMsg || 'An unknown error occurred while communicating with Freighter.',
    originalError: err,
  });
}

export interface FreighterConnectionResult {
  publicKey: string;
  network: StellarNetwork | string;
  networkMismatch: boolean;
}

/**
 * Checks if the Freighter browser extension is installed and available.
 */
export async function isFreighterAvailable(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const res = await freighterIsConnected();
    if (typeof res === 'boolean') {
      return res;
    }
    return Boolean(res && res.isConnected);
  } catch {
    return false;
  }
}

/**
 * Normalizes Freighter's network name/passphrase to Nolyvatix's StellarNetwork type ('mainnet' | 'testnet' | 'futurenet').
 */
export function normalizeFreighterNetwork(rawNetwork: string, passphrase?: string): StellarNetwork | string {
  const normalized = (rawNetwork || '').toUpperCase().trim();
  const pass = (passphrase || '').toUpperCase();

  if (normalized === 'PUBLIC' || pass.includes('PUBLIC GLOBAL STELLAR NETWORK')) {
    return 'mainnet';
  }
  if (normalized === 'TESTNET' || pass.includes('TEST SDF NETWORK')) {
    return 'testnet';
  }
  if (normalized === 'FUTURENET' || pass.includes('TEST SDF FUTURE NETWORK')) {
    return 'futurenet';
  }

  return rawNetwork.toLowerCase() || 'unknown';
}

/**
 * Retrieves the currently active network in Freighter.
 */
export async function getFreighterNetwork(): Promise<{ network: StellarNetwork | string; passphrase?: string }> {
  try {
    const details = await freighterGetNetworkDetails();
    if (details && !('error' in details) && details.network) {
      const normalized = normalizeFreighterNetwork(details.network, details.networkPassphrase);
      return { network: normalized, passphrase: details.networkPassphrase };
    }

    const net = await freighterGetNetwork();
    if (net && !('error' in net) && net.network) {
      const normalized = normalizeFreighterNetwork(net.network, net.networkPassphrase);
      return { network: normalized, passphrase: net.networkPassphrase };
    }

    return { network: 'unknown' };
  } catch (err) {
    return { network: 'unknown' };
  }
}

/**
 * Requests wallet connection access from the Freighter extension.
 * Validates the returned Stellar public key cryptographically.
 */
export async function connectFreighter(expectedNetwork: StellarNetwork = 'mainnet'): Promise<FreighterConnectionResult> {
  const available = await isFreighterAvailable();
  if (!available) {
    throw new FreighterWalletError({
      code: 'FREIGHTER_NOT_INSTALLED',
      message: 'Freighter extension not detected. Please install Freighter from freighter.app.',
    });
  }

  let addressResult: any;
  try {
    addressResult = await freighterRequestAccess();
  } catch (err: any) {
    const errMsg = (err?.message || '').toLowerCase();
    if (errMsg.includes('user rejected') || errMsg.includes('declined') || errMsg.includes('denied')) {
      throw new FreighterWalletError({
        code: 'USER_REJECTED',
        message: 'Freighter connection request was declined by the user.',
        originalError: err,
      });
    }
    if (errMsg.includes('locked')) {
      throw new FreighterWalletError({
        code: 'WALLET_LOCKED',
        message: 'Freighter wallet is locked. Please unlock the extension and try again.',
        originalError: err,
      });
    }
    throw new FreighterWalletError({
      code: 'UNKNOWN',
      message: err?.message || 'Failed to connect to Freighter wallet.',
      originalError: err,
    });
  }

  // Handle object response or string address
  if (addressResult?.error) {
    const errorMsg = typeof addressResult.error === 'string'
      ? addressResult.error
      : addressResult.error.message || 'Access request rejected.';
    const lower = errorMsg.toLowerCase();

    if (lower.includes('reject') || lower.includes('decline') || lower.includes('denied') || addressResult.error.code === -2) {
      throw new FreighterWalletError({
        code: 'USER_REJECTED',
        message: 'Freighter connection request was declined by the user.',
        originalError: addressResult.error,
      });
    }

    throw new FreighterWalletError({
      code: 'UNKNOWN',
      message: errorMsg,
      originalError: addressResult.error,
    });
  }

  let resolvedAddress = '';
  if (typeof addressResult === 'string') {
    resolvedAddress = addressResult;
  } else if (addressResult?.address) {
    resolvedAddress = addressResult.address;
  } else {
    // Fallback attempt to read address
    try {
      const addrObj = await freighterGetAddress();
      if (typeof addrObj === 'string') {
        resolvedAddress = addrObj;
      } else if (addrObj?.address) {
        resolvedAddress = addrObj.address;
      }
    } catch {
      // Ignored
    }
  }

  // Validate address structure & checksum
  if (!isValidStellarPublicKey(resolvedAddress)) {
    throw new FreighterWalletError({
      code: 'INVALID_ADDRESS',
      message: 'Freighter returned an invalid or malformed Stellar public account key.',
    });
  }

  // Query network from Freighter
  const { network: walletNetwork } = await getFreighterNetwork();
  const networkMismatch = walletNetwork !== 'unknown' && walletNetwork !== expectedNetwork;

  return {
    publicKey: resolvedAddress,
    network: walletNetwork,
    networkMismatch,
  };
}

/**
 * Queries real native XLM balance from Horizon backend for a connected public key
 */
export async function fetchNativeBalance(publicKey: string): Promise<number | null> {
  if (!isValidStellarPublicKey(publicKey)) {
    return null;
  }

  try {
    const res = await fetch(`/api/accounts/${encodeURIComponent(publicKey)}/balances`);
    if (!res.ok) {
      if (res.status === 404) {
        // Unfunded account on this network
        return 0;
      }
      return null;
    }
    const data = await res.json();
    const balances = data?.data;
    if (Array.isArray(balances)) {
      const native = balances.find((b: any) => b.asset_type === 'native');
      if (native && native.balance) {
        return parseFloat(native.balance);
      }
      return 0;
    }
    return null;
  } catch {
    return null;
  }
}
