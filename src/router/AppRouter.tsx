/**
 * Nolyvatix - Production Unified App Router
 * Supports lazy loading, code-splitting, deep-linking, browser history, and 404/error states
 */

import React, { useEffect, useState, Suspense, lazy } from 'react';
import { useAppStore } from '../store/useAppStore';
import { NavRoute } from '../types';
import { resolveRoute, getRouteConfig } from './routeRegistry';
import { RouteLoadingSkeleton } from '../components/common/RouteLoadingSkeleton';

// Lazy-loaded production views for optimal bundle splitting
const CommandCenterView = lazy(() =>
  import('../views/CommandCenterView').then((m) => ({ default: m.CommandCenterView }))
);
const DashboardBuilderView = lazy(() =>
  import('../views/DashboardBuilderView').then((m) => ({ default: m.DashboardBuilderView }))
);
const ReportBuilderView = lazy(() =>
  import('../views/ReportBuilderView').then((m) => ({ default: m.ReportBuilderView }))
);
const AlertCenterView = lazy(() =>
  import('../views/AlertCenterView').then((m) => ({ default: m.AlertCenterView }))
);
const WorkspaceHubView = lazy(() =>
  import('../views/WorkspaceHubView').then((m) => ({ default: m.WorkspaceHubView }))
);
const SearchCenterView = lazy(() =>
  import('../views/SearchCenterView').then((m) => ({ default: m.SearchCenterView }))
);
const ExportCenterView = lazy(() =>
  import('../views/ExportCenterView').then((m) => ({ default: m.ExportCenterView }))
);
const WalletIntelligenceView = lazy(() =>
  import('../views/WalletIntelligenceView').then((m) => ({ default: m.WalletIntelligenceView }))
);
const SorobanAPMView = lazy(() =>
  import('../views/SorobanAPMView').then((m) => ({ default: m.SorobanAPMView }))
);
const AssetsCorridorsView = lazy(() =>
  import('../views/AssetsCorridorsView').then((m) => ({ default: m.AssetsCorridorsView }))
);
const AICopilotView = lazy(() =>
  import('../views/AICopilotView').then((m) => ({ default: m.AICopilotView }))
);
const SettingsCenterView = lazy(() =>
  import('../views/SettingsCenterView').then((m) => ({ default: m.SettingsCenterView }))
);

// Statically imported error and fallback views to ensure offline and error recovery is always available in memory
import { NotFoundView } from '../views/errors/NotFoundView';
import { AccessDeniedView } from '../views/errors/AccessDeniedView';
import { ServerErrorView } from '../views/errors/ServerErrorView';
import { OfflineView } from '../views/errors/OfflineView';

export const AppRouter: React.FC = () => {
  const activeRoute = useAppStore((state) => state.activeRoute);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Online / Offline connectivity listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen to browser URL hash changes (back/forward buttons, manual URL entry)
  useEffect(() => {
    const handleHashChange = () => {
      const currentHash = window.location.hash;
      const targetRoute = resolveRoute(currentHash);
      
      const currentRoute = useAppStore.getState().activeRoute;
      if (targetRoute !== currentRoute) {
        useAppStore.getState().setActiveRoute(targetRoute);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    
    // Initial sync on mount
    if (window.location.hash) {
      handleHashChange();
    } else {
      const initialRoute = useAppStore.getState().activeRoute || 'command-center';
      window.location.hash = `#/${initialRoute}`;
    }

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []); // Run ONLY once on mount to avoid infinite state update loop

  // Update hash and document title when activeRoute changes
  useEffect(() => {
    const expectedHash = `#/${activeRoute}`;
    if (window.location.hash !== expectedHash) {
      window.location.hash = expectedHash;
    }

    const config = getRouteConfig(activeRoute);
    if (config) {
      document.title = `${config.label} | Nolyvatix - Stellar BI`;
    }
  }, [activeRoute]);

  if (!isOnline && activeRoute !== 'offline') {
    return <OfflineView />;
  }

  const renderActiveView = () => {
    switch (activeRoute) {
      case 'command-center':
        return <CommandCenterView />;
      case 'dashboard-builder':
      case 'custom-dashboards':
        return <DashboardBuilderView />;
      case 'report-builder':
        return <ReportBuilderView />;
      case 'alert-center':
      case 'alerts-settings':
        return <AlertCenterView />;
      case 'workspace-hub':
        return <WorkspaceHubView />;
      case 'search-center':
        return <SearchCenterView />;
      case 'export-center':
        return <ExportCenterView />;
      case 'wallet-intelligence':
        return <WalletIntelligenceView />;
      case 'soroban-apm':
        return <SorobanAPMView />;
      case 'assets-corridors':
        return <AssetsCorridorsView />;
      case 'ai-copilot':
        return <AICopilotView />;
      case 'settings-center':
        return <SettingsCenterView />;
      case 'access-denied':
        return <AccessDeniedView />;
      case 'server-error':
        return <ServerErrorView />;
      case 'offline':
        return <OfflineView />;
      case 'not-found':
      default:
        return <NotFoundView />;
    }
  };

  return (
    <Suspense fallback={<RouteLoadingSkeleton />}>
      {renderActiveView()}
    </Suspense>
  );
};
