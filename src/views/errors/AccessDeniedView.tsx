import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../../components/ui/Button';
import { GlassCard } from '../../components/ui/GlassCard';
import { ShieldAlert, Wallet, Home, ArrowLeft } from 'lucide-react';

export const AccessDeniedView: React.FC = () => {
  const { setActiveRoute } = useAppStore();

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <GlassCard className="max-w-lg w-full text-center p-8 space-y-6 border-zinc-800 bg-zinc-950/90 shadow-2xl">
        <div className="w-16 h-16 mx-auto bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-2xl flex items-center justify-center">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="font-mono text-xs font-semibold px-2.5 py-1 bg-rose-500/20 text-rose-300 rounded-full border border-rose-500/30">
            HTTP 403 • ACCESS_RESTRICTED
          </span>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-2">
            Workspace Permission Required
          </h1>
          <p className="text-xs text-zinc-400 font-mono max-w-sm mx-auto leading-relaxed">
            This workspace board or alert configuration is restricted. Authenticate with an authorized tenant account or switch to a public workspace. Stellar Web3 wallet connection is independent of tenant workspace access.
          </p>
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
            Command Center
          </Button>
        </div>
      </GlassCard>
    </div>
  );
};

export default AccessDeniedView;
