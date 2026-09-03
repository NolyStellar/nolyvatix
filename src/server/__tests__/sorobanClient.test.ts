/**
 * Nolyvatix Data Engine - SorobanClient Unit & Regression Tests
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { SorobanClient, SOROBAN_RPC_ENDPOINTS } from '../clients/sorobanClient.js';
import { StellarSorobanClient, SOROBAN_NETWORKS } from '../services/stellar/sorobanClient.js';

describe('SorobanClient Configuration & Endpoint Routing', () => {
  test('SOROBAN_RPC_ENDPOINTS constants must have distinct mainnet and testnet endpoints', () => {
    assert.strictEqual(SOROBAN_RPC_ENDPOINTS.mainnet, 'https://mainnet.sorobanrpc.com');
    assert.strictEqual(SOROBAN_RPC_ENDPOINTS.testnet, 'https://soroban-testnet.stellar.org');
    assert.strictEqual(SOROBAN_RPC_ENDPOINTS.futurenet, 'https://rpc-futurenet.stellar.org');
    assert.notStrictEqual(SOROBAN_RPC_ENDPOINTS.mainnet, SOROBAN_RPC_ENDPOINTS.testnet);
    assert.ok(!SOROBAN_RPC_ENDPOINTS.mainnet.includes('testnet'), 'Mainnet endpoint must not contain testnet URL');
  });

  test('should initialize with default mainnet configuration pointing to official Soroban RPC', () => {
    const client = new SorobanClient({ network: 'mainnet' });
    assert.strictEqual(client.getNetwork(), 'mainnet');
    assert.strictEqual(client.getRpcUrl(), 'https://mainnet.sorobanrpc.com');
    // Regression check: mainnet must NEVER point to testnet
    assert.notStrictEqual(client.getRpcUrl(), 'https://soroban-testnet.stellar.org');
  });

  test('should default to mainnet when initialized without arguments', () => {
    const client = new SorobanClient();
    assert.strictEqual(client.getNetwork(), 'mainnet');
    assert.strictEqual(client.getRpcUrl(), 'https://mainnet.sorobanrpc.com');
  });

  test('should switch network configuration to testnet and back to mainnet cleanly', () => {
    const client = new SorobanClient({ network: 'mainnet' });
    assert.strictEqual(client.getRpcUrl(), 'https://mainnet.sorobanrpc.com');

    // Switch to testnet
    client.setNetwork('testnet');
    assert.strictEqual(client.getNetwork(), 'testnet');
    assert.strictEqual(client.getRpcUrl(), 'https://soroban-testnet.stellar.org');

    // Switch back to mainnet
    client.setNetwork('mainnet');
    assert.strictEqual(client.getNetwork(), 'mainnet');
    assert.strictEqual(client.getRpcUrl(), 'https://mainnet.sorobanrpc.com');
  });

  test('should switch network configuration to futurenet', () => {
    const client = new SorobanClient();
    client.setNetwork('futurenet');
    assert.strictEqual(client.getNetwork(), 'futurenet');
    assert.strictEqual(client.getRpcUrl(), 'https://rpc-futurenet.stellar.org');
  });

  test('should support custom RPC URL in constructor and trim trailing slashes', () => {
    const customUrl = 'https://rpc.stellar.custom-node.io/';
    const client = new SorobanClient({ network: 'mainnet', rpcUrl: customUrl });
    assert.strictEqual(client.getRpcUrl(), 'https://rpc.stellar.custom-node.io');
    assert.strictEqual(client.getNetwork(), 'mainnet');
  });

  test('should support custom RPC URL in setNetwork and trim trailing slashes', () => {
    const client = new SorobanClient();
    client.setNetwork('mainnet', 'https://private-rpc.enterprise.com///');
    assert.strictEqual(client.getRpcUrl(), 'https://private-rpc.enterprise.com');
  });

  test('StellarSorobanClient (services) must also route mainnet to official Soroban RPC', () => {
    assert.strictEqual(SOROBAN_NETWORKS.mainnet, 'https://mainnet.sorobanrpc.com');
    const serviceClient = new StellarSorobanClient({ network: 'mainnet' });
    assert.strictEqual(serviceClient.getNetwork(), 'mainnet');
    assert.strictEqual(serviceClient.getRpcUrl(), 'https://mainnet.sorobanrpc.com');
    assert.notStrictEqual(serviceClient.getRpcUrl(), 'https://soroban-testnet.stellar.org');
  });
});
