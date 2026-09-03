/**
 * Nolyvatix - Centralized Shared Route Registry
 * Single Source of Truth for Navigation, Routing, Breadcrumbs, and Metadata
 */

import { NavRoute } from '../types';

export interface RouteDefinition {
  id: NavRoute;
  path: string;
  label: string;
  shortLabel?: string;
  description: string;
  category: 'core' | 'bi' | 'analytics' | 'system' | 'error';
  badge?: string;
  badgeVariant?: 'info' | 'success' | 'warning';
  icon: string;
  isNavVisible: boolean;
  breadcrumbs: { label: string; route?: NavRoute }[];
}

export const ROUTE_ALIASES: Record<string, NavRoute> = {
  'custom-dashboards': 'dashboard-builder',
  'alerts-settings': 'alert-center',
  'settings': 'settings-center',
  'search': 'search-center',
  'export': 'export-center',
  'reports': 'report-builder',
  'dashboards': 'dashboard-builder',
  'alerts': 'alert-center',
  'workspace': 'workspace-hub',
  'wallets': 'wallet-intelligence',
  'soroban': 'soroban-apm',
  'assets': 'assets-corridors',
  'ai': 'ai-copilot',
};

export const ROUTE_REGISTRY: Record<NavRoute, RouteDefinition> = {
  'command-center': {
    id: 'command-center',
    path: '#/command-center',
    label: 'Command Center',
    shortLabel: 'Overview',
    description: 'Live Stellar ledger telemetry, real-time TPS, and network pulse',
    category: 'core',
    badge: 'Live',
    badgeVariant: 'success',
    icon: 'LayoutDashboard',
    isNavVisible: true,
    breadcrumbs: [
      { label: 'Platform', route: 'command-center' },
      { label: 'Command Center' },
    ],
  },
  'dashboard-builder': {
    id: 'dashboard-builder',
    path: '#/dashboard-builder',
    label: 'Dashboard Builder',
    shortLabel: 'Dashboards',
    description: 'Custom 12-column responsive BI widget grids and saved workspace boards',
    category: 'bi',
    badge: 'BI',
    badgeVariant: 'info',
    icon: 'Grid3X3',
    isNavVisible: true,
    breadcrumbs: [
      { label: 'Business Intelligence', route: 'dashboard-builder' },
      { label: 'Custom Dashboards' },
    ],
  },
  'report-builder': {
    id: 'report-builder',
    path: '#/report-builder',
    label: 'Report Builder',
    shortLabel: 'Reports',
    description: 'Automated executive digests and multi-format PDF/CSV export pipelines',
    category: 'bi',
    badge: 'Export',
    badgeVariant: 'info',
    icon: 'FileText',
    isNavVisible: true,
    breadcrumbs: [
      { label: 'Business Intelligence', route: 'report-builder' },
      { label: 'Executive Reports' },
    ],
  },
  'alert-center': {
    id: 'alert-center',
    path: '#/alert-center',
    label: 'Alert Center',
    shortLabel: 'Alerts',
    description: 'Automated triggers, on-chain guardrails, and Discord/Slack webhook dispatchers',
    category: 'system',
    icon: 'Bell',
    isNavVisible: true,
    breadcrumbs: [
      { label: 'Automation', route: 'alert-center' },
      { label: 'Alert Rules & Webhooks' },
    ],
  },
  'workspace-hub': {
    id: 'workspace-hub',
    path: '#/workspace-hub',
    label: 'Workspace Hub',
    shortLabel: 'Workspace',
    description: 'Pinned dashboards, watched accounts, starred assets, and query history',
    category: 'core',
    icon: 'Briefcase',
    isNavVisible: true,
    breadcrumbs: [
      { label: 'Platform', route: 'workspace-hub' },
      { label: 'User Workspace Hub' },
    ],
  },
  'search-center': {
    id: 'search-center',
    path: '#/search-center',
    label: 'Universal Search',
    shortLabel: 'Search',
    description: 'Cross-entity search across accounts, transactions, contracts, and reports',
    category: 'core',
    icon: 'Search',
    isNavVisible: true,
    breadcrumbs: [
      { label: 'Platform', route: 'search-center' },
      { label: 'Universal Search' },
    ],
  },
  'export-center': {
    id: 'export-center',
    path: '#/export-center',
    label: 'Export Center',
    shortLabel: 'Exports',
    description: 'Batch export pipeline for PDF, CSV, JSON, Markdown, PNG, and SVG',
    category: 'bi',
    icon: 'Download',
    isNavVisible: true,
    breadcrumbs: [
      { label: 'Data Management', route: 'export-center' },
      { label: 'Export Pipeline' },
    ],
  },
  'wallet-intelligence': {
    id: 'wallet-intelligence',
    path: '#/wallet-intelligence',
    label: 'Wallet Intelligence',
    shortLabel: 'Wallets',
    description: 'Deep account explorer, balance distributions, and payment flows',
    category: 'analytics',
    icon: 'Wallet',
    isNavVisible: true,
    breadcrumbs: [
      { label: 'Analytics', route: 'wallet-intelligence' },
      { label: 'Wallet Intelligence' },
    ],
  },
  'soroban-apm': {
    id: 'soroban-apm',
    path: '#/soroban-apm',
    label: 'Soroban APM',
    shortLabel: 'Soroban',
    description: 'WASM contract profiler, CPU instruction telemetry, and event decoder',
    category: 'analytics',
    badge: 'WASM',
    badgeVariant: 'info',
    icon: 'Cpu',
    isNavVisible: true,
    breadcrumbs: [
      { label: 'Smart Contracts', route: 'soroban-apm' },
      { label: 'Soroban Profiler' },
    ],
  },
  'assets-corridors': {
    id: 'assets-corridors',
    path: '#/assets-corridors',
    label: 'Assets & Corridors',
    shortLabel: 'Corridors',
    description: 'Stellar anchor remittance velocity, AMM liquidity pools, and order books',
    category: 'analytics',
    icon: 'ArrowRightLeft',
    isNavVisible: true,
    breadcrumbs: [
      { label: 'DeFi & Rails', route: 'assets-corridors' },
      { label: 'Asset Corridors' },
    ],
  },
  'ai-copilot': {
    id: 'ai-copilot',
    path: '#/ai-copilot',
    label: 'Gemini AI Insights',
    shortLabel: 'Gemini AI',
    description: 'Natural language ledger queries and automated visual chart synthesis',
    category: 'bi',
    badge: 'AI',
    badgeVariant: 'info',
    icon: 'Sparkles',
    isNavVisible: true,
    breadcrumbs: [
      { label: 'AI Intelligence', route: 'ai-copilot' },
      { label: 'Gemini Co-Pilot' },
    ],
  },
  'settings-center': {
    id: 'settings-center',
    path: '#/settings-center',
    label: 'Settings & Prefs',
    shortLabel: 'Settings',
    description: 'Theme preferences, network defaults, AI configuration, and shortcuts',
    category: 'system',
    icon: 'Settings',
    isNavVisible: true,
    breadcrumbs: [
      { label: 'System', route: 'settings-center' },
      { label: 'Platform Preferences' },
    ],
  },
  'custom-dashboards': {
    id: 'custom-dashboards',
    path: '#/dashboard-builder',
    label: 'Custom Dashboards (Legacy)',
    description: 'Alias to Dashboard Builder',
    category: 'bi',
    icon: 'Grid3X3',
    isNavVisible: false,
    breadcrumbs: [{ label: 'Dashboards' }],
  },
  'alerts-settings': {
    id: 'alerts-settings',
    path: '#/alert-center',
    label: 'Alerts Settings (Legacy)',
    description: 'Alias to Alert Center',
    category: 'system',
    icon: 'Bell',
    isNavVisible: false,
    breadcrumbs: [{ label: 'Alerts' }],
  },
  'not-found': {
    id: 'not-found',
    path: '#/404',
    label: 'Page Not Found',
    description: 'Requested route does not exist',
    category: 'error',
    icon: 'AlertTriangle',
    isNavVisible: false,
    breadcrumbs: [{ label: '404 Not Found' }],
  },
  'access-denied': {
    id: 'access-denied',
    path: '#/403',
    label: 'Access Denied',
    description: 'Insufficient permissions for this workspace',
    category: 'error',
    icon: 'ShieldAlert',
    isNavVisible: false,
    breadcrumbs: [{ label: '403 Forbidden' }],
  },
  'server-error': {
    id: 'server-error',
    path: '#/500',
    label: 'Server Error',
    description: 'Backend gateway communication error',
    category: 'error',
    icon: 'AlertOctagon',
    isNavVisible: false,
    breadcrumbs: [{ label: '500 Server Error' }],
  },
  'offline': {
    id: 'offline',
    path: '#/offline',
    label: 'Offline Mode',
    description: 'Network connection lost',
    category: 'error',
    icon: 'WifiOff',
    isNavVisible: false,
    breadcrumbs: [{ label: 'Offline' }],
  },
};

/**
 * Resolves any route string or alias to a canonical NavRoute
 */
export function resolveRoute(rawRoute: string): NavRoute {
  const normalized = rawRoute.replace(/^#\/?/, '').trim().toLowerCase();
  
  if (normalized in ROUTE_REGISTRY) {
    const candidate = normalized as NavRoute;
    if (candidate === 'custom-dashboards') return 'dashboard-builder';
    if (candidate === 'alerts-settings') return 'alert-center';
    return candidate;
  }

  if (normalized in ROUTE_ALIASES) {
    return ROUTE_ALIASES[normalized];
  }

  return 'not-found';
}

export function isValidRoute(route: string): boolean {
  const resolved = resolveRoute(route);
  return resolved !== 'not-found';
}

export function getRouteConfig(route: NavRoute): RouteDefinition {
  return ROUTE_REGISTRY[route] || ROUTE_REGISTRY['not-found'];
}

export function getVisibleNavRoutes(): RouteDefinition[] {
  return Object.values(ROUTE_REGISTRY).filter((r) => r.isNavVisible);
}
