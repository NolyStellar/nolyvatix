import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { PlatformSettings } from '../types';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { WorkspaceHeader } from '../components/layout/WorkspaceHeader';
import { authFetch } from '../lib/apiClient';
import {
  Settings,
  Sun,
  Moon,
  Globe,
  Sparkles,
  Bell,
  Download,
  Keyboard,
  Save,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  Cpu,
} from 'lucide-react';

export const SettingsCenterView: React.FC = () => {
  const { theme, setTheme, stellarNetwork, setStellarNetwork } = useAppStore();
  const [settings, setSettings] = useState<PlatformSettings>({
    theme: theme,
    refreshIntervalSeconds: 10,
    networkPreference: stellarNetwork,
    aiModel: 'gemini-2.5-flash',
    notificationsEnabled: true,
    exportFormatDefault: 'pdf',
    keyboardShortcutsEnabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await authFetch('/api/settings');
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setSettings(json.data);
        }
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await authFetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setTheme(settings.theme);
        setStellarNetwork(settings.networkPreference as any);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto font-sans">
      <WorkspaceHeader
        title="Platform Settings & Preferences"
        subtitle="Global telemetry intervals, default blockchain network, Gemini AI configuration & exports"
      />

      {savedSuccess && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl font-mono text-xs text-emerald-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Platform preferences saved successfully!</span>
          </div>
          <Badge variant="success">Synchronized</Badge>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appearance & Environment */}
        <GlassCard className="p-6 space-y-5 border-zinc-800 bg-zinc-950/80">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2.5">
              <Sun className="w-4 h-4 text-amber-400" />
              <h3 className="font-semibold text-sm text-white">Appearance & Theme</h3>
            </div>
            <Badge variant="info">Nolyvatix Design System</Badge>
          </div>

          <div className="space-y-4 font-mono text-xs">
            <div>
              <label className="block text-zinc-400 mb-2">Theme Mode</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, theme: 'dark' })}
                  className={`p-3 rounded-lg border flex items-center gap-2.5 transition-all ${
                    settings.theme === 'dark'
                      ? 'bg-sky-500/10 border-sky-500 text-sky-300 font-semibold'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <Moon className="w-4 h-4" />
                  <span>Dark (High-Contrast)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, theme: 'light' })}
                  className={`p-3 rounded-lg border flex items-center gap-2.5 transition-all ${
                    settings.theme === 'light'
                      ? 'bg-sky-500/10 border-sky-500 text-sky-300 font-semibold'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <Sun className="w-4 h-4" />
                  <span>Light</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-zinc-400 mb-1">Default Stellar Environment</label>
              <select
                value={settings.networkPreference}
                onChange={(e) => setSettings({ ...settings, networkPreference: e.target.value as any })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-200 focus:outline-none focus:border-sky-500"
              >
                <option value="mainnet">Stellar Mainnet (Production)</option>
                <option value="testnet">Stellar Testnet (Sandbox)</option>
              </select>
            </div>

            <div>
              <label className="block text-zinc-400 mb-1">Live Telemetry Auto-Refresh Rate</label>
              <select
                value={settings.refreshIntervalSeconds}
                onChange={(e) => setSettings({ ...settings, refreshIntervalSeconds: Number(e.target.value) })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-200 focus:outline-none focus:border-sky-500"
              >
                <option value={5}>5 Seconds (Ultra Low-Latency)</option>
                <option value={10}>10 Seconds (Recommended)</option>
                <option value={30}>30 Seconds (Standard)</option>
                <option value={60}>60 Seconds (Conservation)</option>
              </select>
            </div>
          </div>
        </GlassCard>

        {/* AI & Automation Engine */}
        <GlassCard className="p-6 space-y-5 border-zinc-800 bg-zinc-950/80">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-sky-400" />
              <h3 className="font-semibold text-sm text-white">Gemini AI Co-Pilot & Models</h3>
            </div>
            <Badge variant="success">@google/genai 2.4.0</Badge>
          </div>

          <div className="space-y-4 font-mono text-xs">
            <div>
              <label className="block text-zinc-400 mb-1">AI Inference Model</label>
              <select
                value={settings.aiModel}
                onChange={(e) => setSettings({ ...settings, aiModel: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-200 focus:outline-none focus:border-sky-500"
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Fastest, Recommended for Dynamic Recharts)</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep Reasoning & Anomaly Diagnosis)</option>
              </select>
            </div>

            <div>
              <label className="block text-zinc-400 mb-1">Default BI Export Package</label>
              <select
                value={settings.exportFormatDefault}
                onChange={(e) => setSettings({ ...settings, exportFormatDefault: e.target.value as any })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-200 focus:outline-none focus:border-sky-500"
              >
                <option value="pdf">Adobe PDF Executive Report</option>
                <option value="csv">CSV Spreadsheet Dataset</option>
                <option value="json">JSON Raw Telemetry Object</option>
                <option value="markdown">Markdown Documentation</option>
              </select>
            </div>

            <div className="pt-2 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notificationsEnabled}
                  onChange={(e) => setSettings({ ...settings, notificationsEnabled: e.target.checked })}
                  className="rounded bg-zinc-900 border-zinc-700 text-sky-500 focus:ring-sky-500 w-4 h-4"
                />
                <span className="text-zinc-300">Enable in-app browser alert notifications</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.keyboardShortcutsEnabled}
                  onChange={(e) => setSettings({ ...settings, keyboardShortcutsEnabled: e.target.checked })}
                  className="rounded bg-zinc-900 border-zinc-700 text-sky-500 focus:ring-sky-500 w-4 h-4"
                />
                <span className="text-zinc-300">Enable Command Palette shortcut (Cmd+K / Ctrl+K)</span>
              </label>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Save Button Bar */}
      <div className="flex items-center justify-between p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl font-mono text-xs">
        <div className="flex items-center gap-2 text-zinc-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Settings persist to local workspace runtime state.</span>
        </div>
        <Button
          variant="primary"
          leftIcon={<Save className="w-4 h-4" />}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving Preferences...' : 'Save All Preferences'}
        </Button>
      </div>
    </div>
  );
};
