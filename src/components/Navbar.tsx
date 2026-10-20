import React from 'react';
import { Shield, Play } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingApprovalsCount: number;
  onRunSimulation: () => void;
  isSimulating: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  pendingApprovalsCount,
  onRunSimulation,
  isSimulating,
}) => {
  const navItems = [
    { id: 'monitor', label: 'Live Monitor' },
    {
      id: 'approvals',
      label: 'Approval Queue',
      count: pendingApprovalsCount,
    },
    { id: 'simulator', label: 'Agent Simulator' },
    { id: 'audit', label: 'Audit Ledger' },
    { id: 'policy', label: 'Policy Editor' },
    { id: 'api-docs', label: 'API & SDK' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#181818] border-b border-[#282828] px-4 sm:px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-sm bg-[#222222] border border-[#333333] flex items-center justify-center text-[#F59E0B]">
            <Shield className="w-4 h-4 stroke-[2.2]" />
          </div>
          <button
            onClick={() => setActiveTab('monitor')}
            className="font-display text-lg font-bold tracking-tight text-white hover:text-[#F59E0B] transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-2"
          >
            <span>AgentGuard</span>
          </button>

          <div className="hidden lg:flex items-center gap-2 text-xs text-[#737373] pl-3 border-l border-[#282828] font-mono">
            <span className="w-2 h-2 rounded-full bg-[#86EFAC]" />
            <span className="text-[#A3A3A3] font-medium">PROTECTION ACTIVE</span>
            <span>·</span>
            <span>v3.0 POLICY</span>
          </div>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 text-xs font-medium">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative px-3.5 py-1.5 rounded-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'text-white bg-[#242424] font-semibold border-b-2 border-[#F59E0B]'
                    : 'text-[#A3A3A3] hover:text-white hover:bg-[#202020]'
                }`}
              >
                <span>{item.label}</span>
                {item.count !== undefined && item.count > 0 && (
                  <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold bg-[#F59E0B] text-black rounded-xs">
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Solid Action Button (No Gradients) */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onRunSimulation}
            disabled={isSimulating}
            className="px-4 py-2 text-xs font-semibold text-black bg-[#F59E0B] hover:bg-[#D97706] active:bg-[#B45309] transition-colors whitespace-nowrap shrink-0 disabled:opacity-50 cursor-pointer flex items-center gap-2 rounded-sm"
          >
            {isSimulating ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-black/40 border-t-black rounded-full animate-spin" />
                <span className="font-mono">BENCHMARKING...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run 15 Benchmarks</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
