import React, { useState, useEffect } from 'react';
import { Calendar, X, Hourglass } from 'lucide-react';
import type { Milestone } from '../data/mockData';

interface MilestoneModalProps {
  isOpen: boolean;
  milestone?: Milestone; // If present, we are editing
  onSave: (milestoneData: { title: string; description: string; deadline: string; estimatedEffort: string; priority: 'low' | 'medium' | 'high' }) => void;
  onClose: () => void;
}

export const MilestoneModal: React.FC<MilestoneModalProps> = ({
  isOpen,
  milestone,
  onSave,
  onClose
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [estimatedEffort, setEstimatedEffort] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');

  // Load milestone data if editing
  useEffect(() => {
    if (milestone) {
      setTitle(milestone.title);
      setDescription(milestone.description);
      setDeadline(milestone.deadline);
      setEstimatedEffort(milestone.estimatedEffort);
      setPriority(milestone.priority);
    } else {
      setTitle('');
      setDescription('');
      setDeadline('');
      setEstimatedEffort('');
      setPriority('medium');
    }
  }, [milestone, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !deadline) return;
    onSave({ title, description, deadline, estimatedEffort, priority });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg glass-panel bg-zinc-950 border border-zinc-800 rounded-xl p-6 shadow-2xl space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-900">
          <div className="flex items-center gap-2 text-white">
            <h3 className="text-sm font-bold uppercase tracking-wider font-mono">
              {milestone ? 'Edit Milestone Node' : 'Add Milestone Node'}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-md text-zinc-500 hover:text-zinc-350 hover:bg-zinc-900 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold tracking-wider text-zinc-400 uppercase font-mono">
              Milestone Name
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Gather layout screenshots"
              className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-800 bg-zinc-900/50 text-white text-sm focus:border-purple-500/60 focus:outline-none focus:ring-1 focus:ring-purple-500/10 transition-all"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold tracking-wider text-zinc-400 uppercase font-mono">
              Milestone Objective
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of what completing this milestone accomplishes..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-800 bg-zinc-900/50 text-white text-sm focus:border-purple-500/60 focus:outline-none focus:ring-1 focus:ring-purple-500/10 transition-all leading-relaxed resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Due date */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold tracking-wider text-zinc-400 uppercase font-mono flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                Due Date
              </label>
              <input
                type="date"
                required
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-800 bg-zinc-900/50 text-white text-sm focus:border-purple-500/60 focus:outline-none focus:ring-1 focus:ring-purple-500/10 transition-all"
              />
            </div>

            {/* Estimated effort */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold tracking-wider text-zinc-400 uppercase font-mono flex items-center gap-1">
                <Hourglass className="w-3.5 h-3.5 text-zinc-500" />
                Est. Effort
              </label>
              <input
                type="text"
                value={estimatedEffort}
                onChange={(e) => setEstimatedEffort(e.target.value)}
                placeholder="e.g. 3h, 45m"
                className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-800 bg-zinc-900/50 text-white text-sm focus:border-purple-500/60 focus:outline-none focus:ring-1 focus:ring-purple-500/10 transition-all"
              />
            </div>

            {/* Priority */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold tracking-wider text-zinc-400 uppercase font-mono">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
                className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-800 bg-zinc-900/50 text-white text-sm focus:border-purple-500/60 focus:outline-none focus:ring-1 focus:ring-purple-500/10 transition-all"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          {/* Footer Save / Cancel */}
          <div className="pt-4 border-t border-zinc-900 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 rounded-lg border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs font-bold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title || !deadline}
              className="py-2 px-5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-500/10 disabled:opacity-50 disabled:pointer-events-none transition-all"
            >
              Save Milestone
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
