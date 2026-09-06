/**
 * Nolyvatix Data Engine - Stellar Address & StrKey Cryptographic Validator
 * Adheres strictly to Stellar SEP-0023 StrKey specifications.
 * Pure TypeScript implementation compatible with both browser (Vite) and server (Node).
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

// SEP-0023 StrKey Version bytes (encoded as version << 3)
const VERSION_ACCOUNT_ID = 6 << 3; // 48 -> encodes to 'G'
const VERSION_CONTRACT_ID = 2 << 3; // 16 -> encodes to 'C'
const VERSION_SEED = 18 << 3; // 144 -> encodes to 'S' (strictly rejected for wallet accounts)

/**
 * Calculates CRC16-XModem checksum (polynomial 0x1021, initial 0x0000)
 */
export function crc16xmodem(data: Uint8Array): number {
  let crc = 0x0000;
  for (let i = 0; i < data.length; i++) {
    const byte = data[i];
    let code = (crc >>> 8) & 0xff;
    code ^= byte & 0xff;
    code ^= code >>> 4;
    crc = (crc << 8) & 0xffff;
    crc ^= code;
    code = (code << 5) & 0xffff;
    crc ^= code;
    code = (code << 7) & 0xffff;
    crc ^= code;
  }
  return crc;
}

/**
 * Decodes RFC 4648 Base32 string into Uint8Array
 */
export function decodeBase32(input: string): Uint8Array | null {
  if (typeof input !== 'string') return null;
  const upper = input.toUpperCase().trim();
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (let i = 0; i < upper.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(upper[i]);
    if (idx === -1) {
      return null; // Contains non-Base32 character
    }
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return new Uint8Array(output);
}

export type StellarAddressType = 'account' | 'contract' | 'seed' | 'invalid';

export type StellarValidationReason =
  | 'invalid_type'
  | 'invalid_length'
  | 'invalid_prefix'
  | 'invalid_base32_encoding'
  | 'checksum_mismatch'
  | 'unsupported_type';

export interface StellarAddressValidationResult {
  valid: boolean;
  type: StellarAddressType;
  address: string;
  accountType?: 'ed25519_public_key' | 'contract_id' | 'seed';
  versionByte?: number;
  reason?: StellarValidationReason;
  error?: string;
}

/**
 * Validates a Stellar StrKey address and validates its cryptographic CRC16 checksum.
 */
export function validateStellarAddress(address: unknown): StellarAddressValidationResult {
  if (typeof address !== 'string' || !address) {
    return {
      valid: false,
      type: 'invalid',
      address: '',
      reason: 'invalid_type',
      error: 'Stellar address must be a non-empty string.',
    };
  }

  const trimmed = address.trim();

  if (trimmed.length !== 56) {
    return {
      valid: false,
      type: 'invalid',
      address: trimmed,
      reason: 'invalid_length',
      error: `Invalid address length (${trimmed.length}). Stellar public keys must be exactly 56 characters long.`,
    };
  }

  const prefix = trimmed.charAt(0);
  if (prefix !== 'G') {
    return {
      valid: false,
      type: prefix === 'C' ? 'contract' : prefix === 'S' ? 'seed' : 'invalid',
      address: prefix === 'S' ? '[REDACTED_SEED]' : trimmed,
      reason: 'invalid_prefix',
      error: `Unsupported address prefix "${prefix}". Wallet accounts must begin with "G".`,
    };
  }

  const decoded = decodeBase32(trimmed);
  if (!decoded || decoded.length !== 35) {
    return {
      valid: false,
      type: 'invalid',
      address: trimmed,
      reason: 'invalid_base32_encoding',
      error: 'Malformed Base32 encoding in Stellar address.',
    };
  }

  // 1-byte version + 32-byte payload = 33 bytes for checksum
  const version = decoded[0];
  const payloadWithVersion = decoded.subarray(0, 33);
  const expectedChecksum = decoded[33] | (decoded[34] << 8); // Little-endian 16-bit uint
  const calculatedChecksum = crc16xmodem(payloadWithVersion);

  if (expectedChecksum !== calculatedChecksum) {
    return {
      valid: false,
      type: 'invalid',
      address: trimmed,
      reason: 'checksum_mismatch',
      error: 'Stellar address checksum verification failed.',
    };
  }

  if (version === VERSION_ACCOUNT_ID) {
    return {
      valid: true,
      type: 'account',
      accountType: 'ed25519_public_key',
      versionByte: VERSION_ACCOUNT_ID,
      address: trimmed,
    };
  }

  if (version === VERSION_CONTRACT_ID) {
    return {
      valid: false,
      type: 'contract',
      accountType: 'contract_id',
      versionByte: VERSION_CONTRACT_ID,
      address: trimmed,
      reason: 'invalid_prefix',
      error: 'Address is a Soroban Contract ID ("C..."), not a signer account.',
    };
  }

  if (version === VERSION_SEED) {
    return {
      valid: false,
      type: 'seed',
      accountType: 'seed',
      versionByte: VERSION_SEED,
      address: '[REDACTED_SEED]',
      reason: 'invalid_prefix',
      error: 'Private secret seed ("S...") cannot be used as a public wallet address.',
    };
  }

  return {
    valid: false,
    type: 'invalid',
    address: trimmed,
    reason: 'unsupported_type',
    error: `Unknown StrKey version byte (${version}).`,
  };
}

/**
 * Quick predicate to check if an address is a valid Stellar Account ID (starts with 'G' and passes CRC16)
 */
export function isValidStellarPublicKey(address: unknown): boolean {
  const result = validateStellarAddress(address);
  return result.valid && result.type === 'account';
}

/**
 * Checks if an identifier is a valid Soroban Contract ID
 */
export function isValidContractAddress(id: unknown): boolean {
  if (typeof id !== 'string' || id.length !== 56 || !id.startsWith('C')) return false;
  const decoded = decodeBase32(id);
  if (!decoded || decoded.length !== 35) return false;
  if (decoded[0] !== VERSION_CONTRACT_ID) return false;
  const expectedChecksum = decoded[33] | (decoded[34] << 8);
  const calculatedChecksum = crc16xmodem(decoded.subarray(0, 33));
  return expectedChecksum === calculatedChecksum;
}
