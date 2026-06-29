import React from 'react';
import { AlertCircle, CheckCircle2, RefreshCw, Milestone as MilestoneIcon } from 'lucide-react';
import type { TimelineEvent } from '../data/mockData';

interface TimelineProps {
  events: TimelineEvent[];
}

export const Timeline: React.FC<TimelineProps> = ({ events }) => {
  const getEventStyle = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'alert':
        return {
          icon: AlertCircle,
          colorClass: 'text-rose-400',
          borderClass: 'border-rose-500/30',
          bgClass: 'bg-rose-500/10',
          glow: 'shadow-sm',
        };
      case 'success':
        return {
          icon: CheckCircle2,
          colorClass: 'text-emerald-400',
          borderClass: 'border-emerald-500/30',
          bgClass: 'bg-emerald-500/10',
          glow: 'shadow-sm',
        };
      case 'milestone':
        return {
          icon: MilestoneIcon,
          colorClass: 'text-purple-400',
          borderClass: 'border-purple-500/30',
          bgClass: 'bg-purple-500/10',
          glow: 'shadow-sm',
        };
      default:
        return {
          icon: RefreshCw,
          colorClass: 'text-blue-400',
          borderClass: 'border-blue-500/30',
          bgClass: 'bg-blue-500/10',
          glow: 'shadow-sm',
        };
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="relative pl-6 border-l border-zinc-800/80 space-y-6">
      {events.map((event) => {
        const style = getEventStyle(event.type);
        const Icon = style.icon;

        return (
          <div key={event.id} className="relative group">
            {/* Timeline indicator node */}
            <div
              className={`absolute -left-[35px] top-1.5 w-4.5 h-4.5 rounded-full border bg-zinc-950 flex items-center justify-center transition-transform duration-200 group-hover:scale-110 ${style.borderClass} ${style.colorClass} ${style.glow}`}
            >
              <Icon className="w-2.5 h-2.5" />
            </div>

            {/* Event card content */}
            <div className="glass-panel rounded-xl p-4 border border-zinc-800/60 bg-zinc-950/40 hover:border-zinc-800 transition-all duration-200">
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[10px] font-bold uppercase tracking-wider font-mono px-2 py-0.5 rounded-md border ${style.borderClass} ${style.bgClass} ${style.colorClass}`}>
                  {event.type}
                </span>
                <span className="text-[10px] font-semibold text-zinc-500 font-mono">
                  {formatDate(event.timestamp)}
                </span>
              </div>
              <p className="text-sm text-zinc-300 font-medium leading-relaxed">
                {event.message}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
