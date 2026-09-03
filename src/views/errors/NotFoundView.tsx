import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../../components/ui/Button';
import { GlassCard } from '../../components/ui/GlassCard';
import { AlertTriangle, Home, Search, Grid3X3, ArrowLeft } from 'lucide-react';

export const NotFoundView: React.FC = () => {
  const { setActiveRoute } = useAppStore();

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <GlassCard className="max-w-lg w-full text-center p-8 space-y-6 border-zinc-800 bg-zinc-950/90 shadow-2xl">
        <div className="w-16 h-16 mx-auto bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-2xl flex items-center justify-center">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="font-mono text-xs font-semibold px-2.5 py-1 bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/30">
            HTTP 404 • ROUTE_NOT_FOUND
          </span>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-2">
            Requested Route Does Not Exist
          </h1>
          <p className="text-xs text-zinc-400 font-mono max-w-sm mx-auto leading-relaxed">
            The workspace view, dashboard URL, or blockchain telemetry route you requested could not be located in the Nolyvatix registry.
          </p>
        </div>

        <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl text-left space-y-2 font-mono text-xs text-zinc-300">
          <div className="text-zinc-500 text-[11px] font-semibold uppercase tracking-wider">
            Quick Recovery Pathways:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => setActiveRoute('command-center')}
              className="p-2.5 bg-zinc-850 hover:bg-zinc-800 border border-zinc-700/60 rounded-lg text-left flex items-center gap-2 text-white transition-colors"
            >
              <Home className="w-4 h-4 text-sky-400 shrink-0" />
              <span>Command Center</span>
            </button>
            <button
              onClick={() => setActiveRoute('dashboard-builder')}
              className="p-2.5 bg-zinc-850 hover:bg-zinc-800 border border-zinc-700/60 rounded-lg text-left flex items-center gap-2 text-white transition-colors"
            >
              <Grid3X3 className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Dashboards</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="secondary"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => window.history.back()}
          >
            Go Back
          </Button>
          <Button
            variant="primary"
            leftIcon={<Home className="w-4 h-4" />}
            onClick={() => setActiveRoute('command-center')}
          >
            Return to Command Center
          </Button>
        </div>
      </GlassCard>
    </div>
  );
};

export default NotFoundView;
