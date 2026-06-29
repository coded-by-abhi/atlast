import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  trend?: {
    type: 'positive' | 'negative' | 'neutral';
    value: string;
  };
  icon: LucideIcon;
  status?: 'healthy' | 'at-risk' | 'critical' | 'neutral';
  glow?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtext,
  trend,
  icon: Icon,
  status = 'neutral',
  glow = false
}) => {
  const getStatusClasses = () => {
    switch (status) {
      case 'healthy':
        return {
          glow: 'glow-card-green',
          border: 'border-emerald-500/25',
          text: 'text-emerald-400',
          bg: 'bg-emerald-500/5',
          indicator: 'bg-emerald-500 indicator-dot-green',
          label: 'On Track'
        };
      case 'at-risk':
        return {
          glow: 'glow-card-amber',
          border: 'border-amber-500/25',
          text: 'text-amber-400',
          bg: 'bg-amber-500/5',
          indicator: 'bg-amber-500 indicator-dot-amber',
          label: 'Needs Attention'
        };
      case 'critical':
        return {
          glow: 'glow-card-rose',
          border: 'border-rose-500/25',
          text: 'text-rose-400',
          bg: 'bg-rose-500/5',
          indicator: 'bg-rose-500 indicator-dot-rose',
          label: 'Behind'
        };
      default:
        return {
          glow: 'border-zinc-800 hover:border-zinc-700',
          border: 'border-zinc-800',
          text: 'text-purple-400',
          bg: 'bg-purple-500/5',
          indicator: 'bg-purple-500 shadow-[0_0_8px_#a855f7]',
          label: ''
        };
    }
  };

  const classes = getStatusClasses();

  return (
    <div
      className={`glass-panel glass-panel-hover rounded-xl p-5 relative overflow-hidden transition-all duration-300 ${
        glow ? classes.glow : 'border-zinc-800/80 hover:border-zinc-700/60'
      }`}
    >
      {/* Background glow circle */}
      <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full filter blur-[40px] opacity-10 ${classes.bg}`} />

      <div className="flex items-start justify-between">
        <div className="space-y-2.5">
          <span className="block text-xs font-semibold tracking-wider text-zinc-500 uppercase font-mono">
            {title}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-white font-mono">
              {value}
            </span>
            {trend && (
              <span
                className={`text-xs font-mono font-semibold ${
                  trend.type === 'positive'
                    ? 'text-emerald-400'
                    : trend.type === 'negative'
                    ? 'text-rose-400'
                    : 'text-zinc-400'
                }`}
              >
                {trend.type === 'positive' && '+'}
                {trend.value}
              </span>
            )}
          </div>
          {subtext && (
            <p className="text-xs text-zinc-400 font-medium max-w-[200px] leading-relaxed">
              {subtext}
            </p>
          )}
        </div>

        {/* Icon & Indicator Dot */}
        <div className="flex flex-col items-end justify-between h-full gap-4">
          <div className={`p-2.5 rounded-lg border border-zinc-800 bg-zinc-900/60 ${classes.text}`}>
            <Icon className="w-5 h-5" />
          </div>
          {status !== 'neutral' && (
            <div className="flex items-center gap-1.5 pt-4">
              <span className={`w-2 h-2 rounded-full ${classes.indicator}`} />
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
                {classes.label}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
