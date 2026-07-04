import React, { useEffect, useMemo, useState } from 'react';
import { Command } from 'cmdk';
import {
  Activity,
  BarChart3,
  CandlestickChart,
  Crosshair,
  Layers,
  LineChart,
  Search,
  Settings,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useContractStore, type ContractStore } from '../lib/store';
import { ASSET_LIST } from '../data';

type AppTab = ContractStore['activeTab'];

type SlayerCommand = {
  id: string;
  label: string;
  description?: string;
  shortcut?: string;
  icon: React.ReactNode;
  keywords?: string[];
  action: () => void;
};

/**
 * Slayer command launcher powered by cmdk.
 *
 * This is intentionally wired to the existing Zustand app router instead of fake
 * URLs. Every command changes a real workspace, opens a real filter, or selects a
 * real asset. Ctrl/⌘+K remains the single global entry point for fast navigation.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const setActiveTab = useContractStore(s => s.setActiveTab);
  const setSelectedAsset = useContractStore(s => s.setSelectedAsset);
  const setSelectedOptionType = useContractStore(s => s.setSelectedOptionType);
  const setIsGlobalSearchOpen = useContractStore(s => s.setIsGlobalSearchOpen);
  const setPrismFilter = useContractStore(s => s.setPrismFilter);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      const isCommandK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
      if (isCommandK) {
        event.preventDefault();
        setOpen(value => !value);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const go = (tab: AppTab) => () => {
    setActiveTab(tab);
  };

  const commands: SlayerCommand[] = useMemo(() => [
    {
      id: 'open-gex-terminal',
      label: 'Open GEX Terminal',
      description: 'Dealer gamma map, strike heatmap, candles, walls, and flow context',
      shortcut: 'G',
      icon: <Crosshair className="size-4" />,
      keywords: ['gex', 'gamma', 'dealer', 'strike', 'heatmap', 'terminal', 'chart', 'pinpoint'],
      action: go('pinpoint'),
    },
    {
      id: 'open-skysvision',
      label: 'Open SkysVision',
      description: 'Setup detection, contract strength, target ladder, and trade plan',
      shortcut: 'S',
      icon: <LineChart className="size-4" />,
      keywords: ['skysvision', 'skyvision', 'setup', 'contract', 'strength', 'trade plan'],
      action: go('skyvision'),
    },
    {
      id: 'open-quant-lab',
      label: 'Open Quant Lab',
      description: 'Volatility surfaces, risk-neutral density, Monte Carlo, and dealer models',
      shortcut: 'Q',
      icon: <BarChart3 className="size-4" />,
      keywords: ['quant', 'volatility', 'surface', 'monte carlo', 'model', 'rnd'],
      action: go('quant'),
    },
    {
      id: 'open-options-flow',
      label: 'Options Flow / Dealer Flow',
      description: 'Sweeps, exposure profiles, dealer pressure, and live flow state',
      shortcut: 'F',
      icon: <Activity className="size-4" />,
      keywords: ['flow', 'sweeps', 'blocks', 'premium', 'dealer', 'dex', 'vex'],
      action: go('dealerflow'),
    },
    {
      id: 'open-chart-workspace',
      label: 'Open Chart Workspace',
      description: 'Resizable workstation panels, watchlists, chart, and market structure',
      shortcut: 'C',
      icon: <CandlestickChart className="size-4" />,
      keywords: ['chart', 'workspace', 'layout', 'watchlist', 'panels'],
      action: go('workspace'),
    },
    {
      id: 'open-trade-history',
      label: 'Open Trade History',
      description: 'Audit trail, trust registry, and resolved trade archive',
      shortcut: 'A',
      icon: <ShieldCheck className="size-4" />,
      keywords: ['audit', 'history', 'registry', 'trades', 'journal'],
      action: go('auditor'),
    },
    {
      id: 'open-layout-builder',
      label: 'Layout Builder',
      description: 'Customize chart, watchlist, flow, and terminal panels',
      shortcut: 'L',
      icon: <Layers className="size-4" />,
      keywords: ['layout', 'panels', 'resize', 'workspace'],
      action: go('workspace'),
    },
    {
      id: 'open-settings',
      label: 'Settings',
      description: 'Manage account, data, alerts, keybinds, and display settings',
      shortcut: ',',
      icon: <Settings className="size-4" />,
      keywords: ['settings', 'account', 'alerts', 'display', 'keybinds'],
      action: go('settings'),
    },
    {
      id: 'global-search-assets',
      label: 'Search Tickers / Contracts',
      description: 'Open the built-in Prism search with asset filtering enabled',
      shortcut: '/',
      icon: <Search className="size-4" />,
      keywords: ['search', 'ticker', 'contract', 'asset', 'prism'],
      action: () => { setPrismFilter('Assets'); setIsGlobalSearchOpen(true); },
    },
    {
      id: 'set-calls',
      label: 'Filter Calls',
      description: 'Switch contract side to calls',
      shortcut: 'C',
      icon: <Zap className="size-4" />,
      keywords: ['call', 'calls', 'bullish', 'contract side'],
      action: () => setSelectedOptionType('C'),
    },
    {
      id: 'set-puts',
      label: 'Filter Puts',
      description: 'Switch contract side to puts',
      shortcut: 'P',
      icon: <Zap className="size-4" />,
      keywords: ['put', 'puts', 'bearish', 'contract side'],
      action: () => setSelectedOptionType('P'),
    },
    ...ASSET_LIST.map(asset => ({
      id: `asset-${asset.ticker}`,
      label: `Switch Symbol: ${asset.ticker}`,
      description: asset.name,
      icon: <Search className="size-4" />,
      keywords: [asset.ticker, asset.name, 'symbol', 'ticker'],
      action: () => { setSelectedAsset(asset); setActiveTab('skyvision'); },
    })),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [setActiveTab, setSelectedAsset, setSelectedOptionType, setIsGlobalSearchOpen, setPrismFilter]);

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Slayer Terminal Command Palette"
      className="fixed left-1/2 top-[14vh] z-[10000] w-[min(720px,calc(100vw-32px))] -translate-x-1/2 overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/95 font-mono text-zinc-100 shadow-2xl shadow-black/60 backdrop-blur-xl"
    >
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <Search className="size-4 text-zinc-500" />
        <Command.Input
          autoFocus
          placeholder="Search Slayer Terminal..."
          className="h-9 flex-1 bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
        />
        <kbd className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-medium text-zinc-500">ESC</kbd>
      </div>

      <Command.List className="max-h-[460px] overflow-y-auto p-2">
        <Command.Empty className="px-3 py-10 text-center text-sm text-zinc-500">No command found.</Command.Empty>
        <Command.Group heading="Navigation + Actions" className="px-1 py-2 text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-600">
          {commands.map(command => (
            <Command.Item
              key={command.id}
              value={`${command.label} ${command.description ?? ''} ${command.keywords?.join(' ') ?? ''}`}
              onSelect={() => {
                command.action();
                setOpen(false);
              }}
              className="group flex cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-sm text-zinc-300 outline-none data-[selected=true]:bg-emerald-400/10 data-[selected=true]:text-white"
            >
              <div className="flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-zinc-500 group-data-[selected=true]:border-emerald-400/30 group-data-[selected=true]:text-emerald-300">
                {command.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium leading-none">{command.label}</div>
                {command.description && <div className="mt-1 truncate text-xs text-zinc-600 group-data-[selected=true]:text-zinc-400">{command.description}</div>}
              </div>
              {command.shortcut && <kbd className="rounded-md border border-white/10 bg-black/40 px-2 py-1 text-[10px] text-zinc-600 group-data-[selected=true]:text-zinc-400">{command.shortcut}</kbd>}
            </Command.Item>
          ))}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}

export default CommandPalette;
