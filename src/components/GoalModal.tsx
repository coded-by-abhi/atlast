import React, { useState, useEffect } from 'react';
import { Sparkles, Calendar, X } from 'lucide-react';
import type { Goal } from '../data/mockData';

interface GoalModalProps {
  isOpen: boolean;
  goal?: Goal; // If present, we are editing
  onSave: (goalData: { title: string; description: string; deadline: string; priority: 'low' | 'medium' | 'high'; category: string }) => void;
  onClose: () => void;
}

export const GoalModal: React.FC<GoalModalProps> = ({
  isOpen,
  goal,
  onSave,
  onClose
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [category, setCategory] = useState('Project');

  // Load goal data if editing
  useEffect(() => {
    if (goal) {
      setTitle(goal.title);
      setDescription(goal.description);
      setDeadline(goal.deadline);
      setPriority(goal.priority);
      setCategory(goal.category);
    } else {
      setTitle('');
      setDescription('');
      setDeadline('');
      setPriority('medium');
      setCategory('Project');
    }
  }, [goal, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !deadline) return;
    onSave({ title, description, deadline, priority, category });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg glass-panel bg-zinc-950 border border-zinc-800 rounded-xl p-6 shadow-2xl space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-900">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              {goal ? 'Edit Goal Specifications' : 'Define New Goal'}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold tracking-wider text-zinc-400 uppercase font-mono">
                Goal Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Design Creative Portfolio"
                className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-800 bg-zinc-900/50 text-white text-sm focus:border-purple-500/60 focus:outline-none focus:ring-1 focus:ring-purple-500/10 transition-all"
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold tracking-wider text-zinc-400 uppercase font-mono">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-800 bg-zinc-900/50 text-white text-sm focus:border-purple-500/60 focus:outline-none focus:ring-1 focus:ring-purple-500/10 transition-all"
              >
                <option value="Project">Personal Project</option>
                <option value="Work">Work / Career</option>
                <option value="Study">Study / Research</option>
                <option value="Writing">Writing / Content</option>
                <option value="Coding">Coding / Engineering</option>
                <option value="Event">Event / Travel</option>
                <option value="Life">Life Skill (Swimming, Sports, etc.)</option>
                <option value="Exam">Exam Prep / Academics</option>
                <option value="Personal">Personal Routine / Habits</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold tracking-wider text-zinc-400 uppercase font-mono">
              Goal Details
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detail scope requirements, target outcomes..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-800 bg-zinc-900/50 text-white text-sm focus:border-purple-500/60 focus:outline-none focus:ring-1 focus:ring-purple-500/10 transition-all leading-relaxed resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Deadline */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold tracking-wider text-zinc-400 uppercase font-mono flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                Target Deadline
              </label>
              <input
                type="date"
                required
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-800 bg-zinc-900/50 text-white text-sm focus:border-purple-500/60 focus:outline-none focus:ring-1 focus:ring-purple-500/10 transition-all"
              />
            </div>

            {/* Priority */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold tracking-wider text-zinc-400 uppercase font-mono">
                Priority Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['low', 'medium', 'high'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`py-2 px-1 text-xs font-bold border rounded-lg uppercase tracking-wider font-mono transition-all ${
                      priority === p
                        ? 'bg-purple-950/30 border-purple-500 text-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.1)]'
                        : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/10 text-zinc-500 hover:text-zinc-400'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
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
              Save Goal
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
