import React from 'react';
import { LayoutDashboard, PlusCircle, BrainCircuit, Sparkles, AlertCircle, CheckCircle, Flame } from 'lucide-react';
import type { Goal } from '../data/mockData';

interface SidebarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  goals: Goal[];
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, setCurrentPage, goals }) => {
  const active = goals.filter(g => g.status !== 'archived');
  const healthyCount = active.filter(g => g.status === 'healthy').length;
  const atRiskCount = active.filter(g => g.status === 'at-risk').length;
  const criticalCount = active.filter(g => g.status === 'critical').length;

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'create', label: 'New Goal', icon: PlusCircle },
    { id: 'intelligence', label: 'Goal Insights', icon: BrainCircuit },
  ];

  return (
    <aside className="w-64 h-screen border-r border-zinc-800 bg-zinc-950 flex flex-col justify-between shrink-0 select-none">
      <div>
        {/* Brand / Logo */}
        <div className="p-6 border-b border-zinc-800/60 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-500/10">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-wide text-white font-mono bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-400">
              ATLAST
            </span>
            <span className="block text-[10px] text-zinc-500 font-mono tracking-widest mt-[-2px] uppercase">
              AI Coach
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-zinc-850 text-white border border-zinc-800/60 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-purple-400' : 'text-zinc-500'}`} />
                  <span>{item.label}</span>
                </div>
                {isActive && (
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_#a855f7]" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer / Goal Summary */}
      <div className="p-4 border-t border-zinc-850">
        <div className="p-3.5 bg-zinc-900/20 rounded-xl border border-zinc-850 space-y-3">
          <span className="block text-[10px] font-bold text-zinc-500 font-mono uppercase tracking-widest">
            Goal Summary
          </span>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                On Track
              </span>
              <span className="text-white font-mono font-bold">{healthyCount}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                Needs Attention
              </span>
              <span className="text-white font-mono font-bold">{atRiskCount}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                Behind
              </span>
              <span className="text-white font-mono font-bold">{criticalCount}</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
