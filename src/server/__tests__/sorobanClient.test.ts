/**
 * Nolyvatix Data Engine - Canonical SorobanClient Unit & Regression Tests (ARCH-01)
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import {
  SorobanClient,
  SOROBAN_RPC_ENDPOINTS,
  SOROBAN_NETWORKS,
  StellarSorobanClient,
  defaultSorobanClient,
  defaultStellarSorobanClient,
} from '../clients/sorobanClient.js';
import * as stellarExports from '../services/stellar/index.js';

describe('SorobanClient Configuration & Endpoint Routing', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.STELLAR_NETWORK;
    delete process.env.VITE_STELLAR_NETWORK;
    delete process.env.SOROBAN_RPC_URL;
    delete process.env.VITE_SOROBAN_RPC_URL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

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
    // SEC-01 Regression check: mainnet must NEVER point to testnet
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
    const customUrl = 'https://rpc.stellar.custom-node.io///';
    const client = new SorobanClient({ network: 'mainnet', rpcUrl: customUrl });
    assert.strictEqual(client.getRpcUrl(), 'https://rpc.stellar.custom-node.io');
    assert.strictEqual(client.getNetwork(), 'mainnet');
  });

  test('should support custom RPC URL in setNetwork and trim trailing slashes', () => {
    const client = new SorobanClient();
    client.setNetwork('mainnet', 'https://private-rpc.enterprise.com///');
    assert.strictEqual(client.getRpcUrl(), 'https://private-rpc.enterprise.com');
  });

  test('should respect STELLAR_NETWORK environment variable', () => {
    process.env.STELLAR_NETWORK = 'testnet';
    const client = new SorobanClient();
    assert.strictEqual(client.getNetwork(), 'testnet');
    assert.strictEqual(client.getRpcUrl(), 'https://soroban-testnet.stellar.org');
  });

  test('should respect VITE_STELLAR_NETWORK environment variable fallback', () => {
    process.env.VITE_STELLAR_NETWORK = 'futurenet';
    const client = new SorobanClient();
    assert.strictEqual(client.getNetwork(), 'futurenet');
    assert.strictEqual(client.getRpcUrl(), 'https://rpc-futurenet.stellar.org');
  });

  test('should respect SOROBAN_RPC_URL environment variable override with trailing slash cleanup', () => {
    process.env.SOROBAN_RPC_URL = 'https://custom-soroban.example.com/rpc//';
    const client = new SorobanClient();
    assert.strictEqual(client.getRpcUrl(), 'https://custom-soroban.example.com/rpc');
  });

  test('should respect VITE_SOROBAN_RPC_URL environment variable fallback', () => {
    process.env.VITE_SOROBAN_RPC_URL = 'https://vite-soroban.example.com/rpc/';
    const client = new SorobanClient();
    assert.strictEqual(client.getRpcUrl(), 'https://vite-soroban.example.com/rpc');
  });

  test('getConfig returns an immutable copy of SorobanConfig', () => {
    const client = new SorobanClient({ network: 'mainnet', timeoutMs: 15000 });
    const config = client.getConfig();
    assert.strictEqual(config.network, 'mainnet');
    assert.strictEqual(config.timeoutMs, 15000);
    assert.strictEqual(config.rpcUrl, 'https://mainnet.sorobanrpc.com');
  });

  test('StellarSorobanClient and SOROBAN_NETWORKS are canonical aliases of SorobanClient', () => {
    assert.strictEqual(SOROBAN_NETWORKS, SOROBAN_RPC_ENDPOINTS);
    assert.strictEqual(StellarSorobanClient, SorobanClient);
    assert.strictEqual(defaultStellarSorobanClient, defaultSorobanClient);

    const serviceClient = new StellarSorobanClient({ network: 'mainnet' });
    assert.strictEqual(serviceClient.getNetwork(), 'mainnet');
    assert.strictEqual(serviceClient.getRpcUrl(), 'https://mainnet.sorobanrpc.com');
    assert.notStrictEqual(serviceClient.getRpcUrl(), 'https://soroban-testnet.stellar.org');
  });

  test('services/stellar index re-exports canonical SorobanClient and aliases', () => {
    assert.strictEqual(stellarExports.SorobanClient, SorobanClient);
    assert.strictEqual(stellarExports.StellarSorobanClient, SorobanClient);
    assert.strictEqual(stellarExports.SOROBAN_RPC_ENDPOINTS, SOROBAN_RPC_ENDPOINTS);
    assert.strictEqual(stellarExports.SOROBAN_NETWORKS, SOROBAN_RPC_ENDPOINTS);
  });
});

describe('SorobanClient Telemetry & Extended Helper Methods', () => {
  test('should initialize telemetry stats with healthy status and 0 total calls', () => {
    const client = new SorobanClient({ network: 'mainnet' });
    const stats = client.getHealthStats();

    assert.strictEqual(stats.status, 'healthy');
    assert.strictEqual(stats.network, 'mainnet');
    assert.strictEqual(stats.endpoint, 'https://mainnet.sorobanrpc.com');
    assert.strictEqual(stats.totalCalls, 0);
    assert.strictEqual(stats.successfulCalls, 0);
    assert.strictEqual(stats.failedCalls, 0);
    assert.strictEqual(stats.errorRate, 0);
    assert.strictEqual(stats.lastSuccessfulPing, null);
  });

  test('getFeeStats returns default fallback fees when network call fails or is mocked', async () => {
    const client = new SorobanClient({ network: 'mainnet', rpcUrl: 'https://invalid-nonexistent-node-12345.org' });
    const feeStats = await client.getFeeStats();

    assert.ok(feeStats.sorobanInclusionFee, 'Must include sorobanInclusionFee');
    assert.strictEqual(feeStats.sorobanInclusionFee.min, '100');
    assert.strictEqual(feeStats.sorobanInclusionFee.mode, '100');
    assert.ok(feeStats.inclusionFee, 'Must include inclusionFee');
    assert.strictEqual(feeStats.latestLedger, 0);
  });

  test('getHealth returns healthy fallback when node is unreachable in test environment', async () => {
    const client = new SorobanClient({ network: 'mainnet', rpcUrl: 'https://invalid-nonexistent-node-12345.org' });
    const health = await client.getHealth();

    assert.strictEqual(health.status, 'healthy');
    assert.strictEqual(health.latestLedger, 0);
  });

  test('getEvents returns empty array with fallback when node is unreachable in test environment', async () => {
    const client = new SorobanClient({ network: 'mainnet', rpcUrl: 'https://invalid-nonexistent-node-12345.org' });
    const res = await client.getEvents({ pagination: { limit: 10 } });

    assert.ok(Array.isArray(res.events));
    assert.strictEqual(res.events.length, 0);
    assert.strictEqual(res.latestLedger, 0);
  });

  test('getEvents gracefully handles non-positive startLedger without throwing RPC error', async () => {
    const client = new SorobanClient({ network: 'mainnet', rpcUrl: 'https://invalid-nonexistent-node-12345.org' });
    const res1 = await client.getEvents({ startLedger: 0 });
    assert.strictEqual(res1.events.length, 0);

    const res2 = await client.getEvents({ startLedger: -10 });
    assert.strictEqual(res2.events.length, 0);
  });
});
