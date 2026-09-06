/**
 * Nolyvatix - Stellar Wallet Integration Test Suite (WALLET-01)
 * Validates cryptographic StrKey address verification, checksum computation,
 * error code normalization, and extension boundary safety.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  isValidStellarPublicKey,
  validateStellarAddress,
} from '../../lib/stellar/walletValidator.ts';
import {
  normalizeFreighterError,
  isFreighterAvailable,
  FreighterWalletError,
} from '../../services/wallet/freighterService.ts';

describe('WALLET-01: Stellar Address & StrKey Cryptographic Validation', () => {
  // Canonical Stellar public key examples from live Stellar mainnet
  const VALID_MAINNET_ADDRESS = 'GAUA7XL5K54CC2DDGP77FJ2YBHRJLT36CPZDXWPM6MP7MANOGG77PNJU';
  const VALID_HORIZON_HUB = 'GB6YM6S6NW5UDYQASFDFXHCIVLY7BEPRLYVUBXWME6K7YZKKA4VE2Q7C';
  const VALID_ANCHOR_GATEWAY = 'GBLVLKGRDU66WLWY4XRORJXCC4LDZ347AQTUYBEPBABIZTVITW2OAGIP';

  test('validates genuine 56-character Ed25519 Stellar public keys (starts with G and passes CRC16)', () => {
    assert.strictEqual(isValidStellarPublicKey(VALID_MAINNET_ADDRESS), true);
    assert.strictEqual(isValidStellarPublicKey(VALID_HORIZON_HUB), true);
    assert.strictEqual(isValidStellarPublicKey(VALID_ANCHOR_GATEWAY), true);
  });

  test('validateStellarAddress returns structured success metadata for valid keys', () => {
    const result = validateStellarAddress(VALID_MAINNET_ADDRESS);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.accountType, 'ed25519_public_key');
    assert.strictEqual(result.versionByte, 48); // 6 << 3 = 48 (G prefix in StrKey)
    assert.strictEqual(result.error, undefined);
  });

  test('rejects non-string inputs with invalid_type', () => {
    assert.strictEqual(isValidStellarPublicKey(null), false);
    assert.strictEqual(isValidStellarPublicKey(undefined), false);
    assert.strictEqual(isValidStellarPublicKey(123456789), false);
    assert.strictEqual(isValidStellarPublicKey({}), false);

    const result = validateStellarAddress(null);
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.reason, 'invalid_type');
  });

  test('rejects simulated/mock keys with invalid lengths', () => {
    // Previous simulated mock key was only 45 characters long
    const shortMockKey = 'GAAXK902837465102938475610293847561029384756';
    assert.strictEqual(isValidStellarPublicKey(shortMockKey), false);

    const result = validateStellarAddress(shortMockKey);
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.reason, 'invalid_length');
  });

  test('rejects addresses not starting with G (muxed, contract, secret seed)', () => {
    // Secret seed starts with S
    const secretSeed = 'SBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
    assert.strictEqual(isValidStellarPublicKey(secretSeed), false);
    assert.strictEqual(validateStellarAddress(secretSeed).reason, 'invalid_prefix');

    // Contract address starts with C
    const contractAddr = 'CBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
    assert.strictEqual(isValidStellarPublicKey(contractAddr), false);
    assert.strictEqual(validateStellarAddress(contractAddr).reason, 'invalid_prefix');

    // Muxed address starts with M
    const muxedAddr = 'MBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
    assert.strictEqual(isValidStellarPublicKey(muxedAddr), false);
    assert.strictEqual(validateStellarAddress(muxedAddr).reason, 'invalid_prefix');
  });

  test('rejects addresses containing invalid RFC4648 Base32 characters (0, 1, 8, 9)', () => {
    // Base32 in RFC4648 excludes 0, 1, 8, 9
    const invalidCharAddr = VALID_MAINNET_ADDRESS.slice(0, 50) + '0189' + VALID_MAINNET_ADDRESS.slice(54);
    assert.strictEqual(isValidStellarPublicKey(invalidCharAddr), false);

    const res = validateStellarAddress(invalidCharAddr);
    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.reason, 'invalid_base32_encoding');
  });

  test('rejects addresses with single-character checksum tampering / typos', () => {
    // Alter the final checksum character of a valid address
    const lastChar = VALID_MAINNET_ADDRESS[VALID_MAINNET_ADDRESS.length - 1];
    const replacementChar = lastChar === 'U' ? 'A' : 'U';
    const tamperedAddress = VALID_MAINNET_ADDRESS.slice(0, -1) + replacementChar;

    assert.strictEqual(isValidStellarPublicKey(tamperedAddress), false);
    const res = validateStellarAddress(tamperedAddress);
    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.reason, 'checksum_mismatch');
  });
});

describe('WALLET-01: Freighter Error Normalization & Environment Safety', () => {
  test('isFreighterAvailable safely returns false in non-browser/node environments without throwing', async () => {
    const available = await isFreighterAvailable();
    assert.strictEqual(available, false);
  });

  test('normalizeFreighterError maps extension not installed errors to FREIGHTER_NOT_INSTALLED', () => {
    const err = new Error('Freighter is not installed');
    const normalized = normalizeFreighterError(err);
    assert.ok(normalized instanceof FreighterWalletError);
    assert.strictEqual(normalized.code, 'FREIGHTER_NOT_INSTALLED');
    assert.ok(normalized.message.includes('Freighter extension was not detected'));
  });

  test('normalizeFreighterError maps user declined/rejected errors to USER_REJECTED', () => {
    const err = new Error('User declined access');
    const normalized = normalizeFreighterError(err);
    assert.strictEqual(normalized.code, 'USER_REJECTED');
    assert.ok(normalized.message.includes('declined'));
  });

  test('normalizeFreighterError maps user closed popup errors to USER_REJECTED', () => {
    const err = new Error('Popup closed by user');
    const normalized = normalizeFreighterError(err);
    assert.strictEqual(normalized.code, 'USER_REJECTED');
  });

  test('normalizeFreighterError preserves already normalized FreighterWalletError instances', () => {
    const original = new FreighterWalletError({ code: 'NETWORK_MISMATCH', message: 'Network mismatch' });
    const normalized = normalizeFreighterError(original);
    assert.strictEqual(normalized, original);
    assert.strictEqual(normalized.code, 'NETWORK_MISMATCH');
  });

  test('normalizeFreighterError falls back to UNKNOWN_WALLET_ERROR for general exceptions', () => {
    const err = new Error('Unexpected RPC failure');
    const normalized = normalizeFreighterError(err);
    assert.strictEqual(normalized.code, 'UNKNOWN_WALLET_ERROR');
    assert.strictEqual(normalized.message, 'Unexpected RPC failure');
  });
});
