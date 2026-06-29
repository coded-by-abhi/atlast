import React from 'react';
import { Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';
import type { Recommendation } from '../data/mockData';

interface InsightsPanelProps {
  recommendations: Recommendation[];
  onActionTriggered?: (recommendationId: string, actionText: string) => void;
}

export const InsightsPanel: React.FC<InsightsPanelProps> = ({
  recommendations,
  onActionTriggered
}) => {
  const getLevelColor = (level: Recommendation['level']) => {
    switch (level) {
      case 'critical':
        return 'border-rose-500/20 bg-rose-500/5 text-rose-400';
      case 'high':
        return 'border-amber-500/20 bg-amber-500/5 text-amber-400';
      default:
        return 'border-purple-500/20 bg-purple-500/5 text-purple-400';
    }
  };

  return (
    <div className="glass-panel rounded-xl p-5 border border-zinc-800 space-y-5">
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_#a855f7]" />
          <h3 className="text-sm font-bold tracking-wider uppercase font-mono text-white">
            AI Coach Suggestions
          </h3>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-mono">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span>ATLAST AI V2.0</span>
        </div>
      </div>

      {recommendations.length === 0 ? (
        <div className="py-8 text-center space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto opacity-75" />
          <p className="text-sm text-zinc-400 font-semibold">All goals are on track</p>
          <p className="text-xs text-zinc-500 font-medium">Keep up the steady progress!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {recommendations.map((rec) => {
            const levelStyle = getLevelColor(rec.level);

            return (
              <div
                key={rec.id}
                className={`border rounded-xl p-4 transition-all duration-200 hover:bg-zinc-950/60 ${levelStyle}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold tracking-widest uppercase font-mono">
                      {rec.level} Priority
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold font-mono opacity-80">
                    ADVICE #{(rec.id).toUpperCase()}
                  </span>
                </div>

                {/* Most Important Next Action */}
                <h4 className="text-sm font-bold text-white mb-2 tracking-tight">
                  {rec.action}
                </h4>

                <div className="space-y-2 text-xs text-zinc-400 mt-3 leading-relaxed">
                  {/* Reasoning */}
                  <div>
                    <span className="font-semibold text-zinc-300 font-mono block text-[10px] uppercase tracking-wider mb-0.5">
                      Why it matters
                    </span>
                    <p>{rec.reasoning}</p>
                  </div>

                  {/* Expected Impact */}
                  <div className="pt-1.5 border-t border-zinc-800/20">
                    <span className="font-semibold text-zinc-300 font-mono block text-[10px] uppercase tracking-wider mb-0.5">
                      Expected Impact
                    </span>
                    <p>{rec.impact}</p>
                  </div>
                </div>

                {/* Interactive Action Button */}
                {onActionTriggered && (
                  <button
                    onClick={() => onActionTriggered(rec.id, rec.action)}
                    className="mt-4 w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-zinc-900 border border-zinc-700/80 text-white text-xs font-semibold hover:bg-zinc-800 hover:border-zinc-600 transition-all duration-150"
                  >
                    <span>Apply Suggested Action</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
