import React, { useState, useEffect } from 'react';
import { Sparkles, Calendar, AlertTriangle, ArrowRight, CheckCircle } from 'lucide-react';
import type { Goal } from '../data/mockData';

interface CreateGoalProps {
  prefilledTitle?: string;
  onAddGoal: (goalData: {
    title: string;
    description: string;
    deadline: string;
    priority: "low" | "medium" | "high";
    category: string;
    hoursPerDay: number;
  }) => Promise<void>;
}

export const CreateGoal: React.FC<CreateGoalProps> = ({ onAddGoal, prefilledTitle }) => {
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (prefilledTitle) {
      setTitle(prefilledTitle);
    }
  }, [prefilledTitle]);
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [category, setCategory] = useState('Project');
  const [hoursPerDay, setHoursPerDay] = useState(4);
  const [quickDeadline, setQuickDeadline] = useState("");
  const [formSubmitted, setFormSubmitted] = useState(false);

  // Real-time AI prediction state (client preview of time-risk calculations)
  const [aiAnalysis, setAiAnalysis] = useState({
    probability: 50,
    healthScore: 60,
    status: 'healthy' as Goal['status'],
    message: 'Fill out the goal name and deadline to estimate feasibility.',
    risks: [] as string[]
  });

  // Compute real-time AI mock assessment
  useEffect(() => {
    if (!title || !deadline) {
      setAiAnalysis({
        probability: 50,
        healthScore: 60,
        status: 'healthy',
        message: 'Fill out the goal name and deadline to estimate feasibility.',
        risks: []
      });
      return;
    }

    const today = new Date();
    const targetDate = new Date(deadline);
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let baseProb = 75;
    let message = 'Timeline buffer looks good. Ready to begin.';
    let computedStatus: Goal['status'] = 'healthy';
    let risks: string[] = [];

    // Tweak probability based on days remaining
    if (diffDays <= 0) {
      baseProb = 5;
      computedStatus = 'critical';
      message = 'The deadline date is in the past.';
      risks.push('Invalid deadline date.');
    } else if (diffDays < 7) {
      baseProb = 35;
      computedStatus = 'critical';
      message = 'Tight timeline. You will need intensive daily effort to finish in time.';
      risks.push('Short execution window (under 7 days).');
    } else if (diffDays < 15) {
      baseProb = 58;
      computedStatus = 'at-risk';
      message = 'Narrow deadline buffer. Minimize distractions to keep on track.';
      risks.push('Moderate time constraint (under 15 days).');
    }

    // Tweak based on description length
    if (description.length > 0 && description.length < 20) {
      baseProb -= 5;
      risks.push('Short description. Adding details helps clarify milestones.');
    }

    // High priority adds workload pressure
    if (priority === 'high') {
      baseProb -= 8;
      risks.push('High priority increases potential schedule overlap.');
    }

    const finalProb = Math.min(Math.max(Math.round(baseProb), 5), 98);
    const finalHealth = Math.min(Math.max(finalProb + 5, 10), 98);

    setAiAnalysis({
      probability: finalProb,
      healthScore: finalHealth,
      status: computedStatus,
      message: message,
      risks: risks.length > 0 ? risks : ['All inputs are clear. Safe planning.']
    });
  }, [title, description, deadline, priority]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !deadline) return;

    onAddGoal({
      title,
      description,
      deadline,
      priority,
      category,
      hoursPerDay,
    });

    setFormSubmitted(true);

    // Reset fields
    setTitle('');
    setDescription('');
    setDeadline('');
    setPriority('medium');
    setCategory('Project');

    setTimeout(() => {
      setFormSubmitted(false);
    }, 4000);
  };

  const getStatusColorClass = (status: Goal['status']) => {
    switch (status) {
      case 'healthy': return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
      case 'at-risk': return 'text-amber-400 border-amber-500/20 bg-amber-500/5';
      default: return 'text-rose-400 border-rose-500/20 bg-rose-500/5';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-screen bg-zinc-950">
      {/* Header */}
      <div className="pb-6 border-b border-zinc-900">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold tracking-widest text-zinc-500 uppercase font-mono">
            New Objective
          </span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white mt-1">
          Create New Goal
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        {/* Form Column */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-3 glass-panel border border-zinc-800 rounded-xl p-6 space-y-5"
        >
          {formSubmitted && (
            <div className="p-4 border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 rounded-lg flex items-center gap-3 text-sm">
              <CheckCircle className="w-5 h-5 shrink-0" />
              <div>
                <strong className="block font-bold">
                  Goal Created Successfully!
                </strong>
                <span>
                  The system has integrated your objective and calculated the
                  preliminary critical path. Check your Dashboard.
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Goal Title */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold tracking-wider text-zinc-400 uppercase font-mono">
                Goal Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Design Creative Portfolio Showcase"
                className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-800 bg-zinc-950/80 text-white text-sm focus:border-purple-500/60 focus:outline-none focus:ring-1 focus:ring-purple-500/20 transition-all font-medium"
              />
            </div>

            {/* Category selection */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold tracking-wider text-zinc-400 uppercase font-mono">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-800 bg-zinc-900 text-white text-sm focus:border-purple-500/60 focus:outline-none focus:ring-1 focus:ring-purple-500/20 transition-all font-medium"
              >
                <option value="Project">Personal Project</option>
                <option value="Work">Work / Career</option>
                <option value="Study">Study / Research</option>
                <option value="Writing">Writing / Content</option>
                <option value="Coding">Coding / Engineering</option>
                <option value="Event">Event / Travel</option>
                <option value="Life">
                  Life Skill (Swimming, Sports, etc.)
                </option>
                <option value="Exam">Exam Prep / Academics</option>
                <option value="Personal">Personal Routine / Habits</option>
              </select>
            </div>
          </div>

          {/* Goal Description */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold tracking-wider text-zinc-400 uppercase font-mono">
              Goal Details / Notes
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe targets, key milestones, resources involved..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-800 bg-zinc-900 text-white text-sm focus:border-purple-500/60 focus:outline-none focus:ring-1 focus:ring-purple-500/20 transition-all font-medium leading-relaxed resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Deadline */}
            <div className="space-y-3">
              <label className="block text-xs font-bold tracking-wider text-zinc-400 uppercase font-mono flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Target Deadline
              </label>

              <select
                value={quickDeadline}
                onChange={(e) => {
                  const value = e.target.value;
                  setQuickDeadline(value);

                  if (value) {
                    const date = new Date();

                    date.setDate(date.getDate() + Number(value));

                    setDeadline(date.toISOString().split("T")[0]);
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-800 bg-zinc-900 text-white"
              >
                <option value="">Custom Date</option>
                <option value="3">3 Days</option>
                <option value="7">1 Week</option>
                <option value="14">2 Weeks</option>
                <option value="30">1 Month</option>
                <option value="90">3 Months</option>
              </select>

              <input
                type="date"
                required
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-800 bg-zinc-900 text-white text-sm"
              />
            </div>

            {/* Priority selection */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold tracking-wider text-zinc-400 uppercase font-mono">
                Priority Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["low", "medium", "high"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`py-2.5 text-xs font-bold border rounded-lg uppercase tracking-wider font-mono transition-all duration-150 ${
                      priority === p
                        ? "bg-purple-900/40 border-purple-500 text-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.15)]"
                        : "border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 text-zinc-550 hover:text-zinc-450"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold tracking-wider text-zinc-400 uppercase font-mono">
              Hours Available Per Day
            </label>

            <select
              value={hoursPerDay}
              onChange={(e) => setHoursPerDay(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-800 bg-zinc-900 text-white"
            >
              <option value={1}>1 Hour</option>
              <option value={2}>2 Hours</option>
              <option value={3}>3 Hours</option>
              <option value={4}>4 Hours</option>
              <option value={5}>5 Hours</option>
              <option value={6}>6 Hours</option>
              <option value={7}>7 Hours</option>
              <option value={8}>8 Hours</option>
            </select>
          </div>

          <div className="pt-4 border-t border-zinc-800/60 flex items-center justify-end">
            <button
              type="submit"
              disabled={!title || !deadline}
              className="flex items-center gap-1.5 py-2.5 px-6 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-500/10 hover:shadow-purple-500/20 disabled:opacity-50 disabled:pointer-events-none transition-all duration-150"
            >
              <span>Add Goal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* AI Preview Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel border border-zinc-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-850">
              <h3 className="text-xs font-bold tracking-wider uppercase font-mono text-zinc-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                AI Assistant Feasibility Check
              </h3>
            </div>

            {/* Feasibility Indicator Circle */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full border-2 border-zinc-800 flex flex-col items-center justify-center font-mono relative shrink-0">
                <span className="text-xl font-extrabold text-white">
                  {aiAnalysis.probability}%
                </span>
                <span className="text-[7px] text-zinc-500 uppercase tracking-wider font-bold">
                  FEASIBLE
                </span>

                <div
                  className={`absolute inset-0 rounded-full border-2 ${
                    aiAnalysis.probability >= 75
                      ? "border-emerald-500/20"
                      : aiAnalysis.probability >= 50
                        ? "border-amber-500/20"
                        : "border-rose-500/20"
                  }`}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold uppercase font-mono border px-2 py-0.5 rounded ${getStatusColorClass(aiAnalysis.status)}`}
                  >
                    {aiAnalysis.status === "healthy"
                      ? "On Track"
                      : aiAnalysis.status === "at-risk"
                        ? "Needs Work"
                        : "Behind"}
                  </span>
                  {aiAnalysis.probability < 60 && (
                    <span className="text-[9px] font-bold text-rose-400 bg-rose-500/5 px-2 py-0.5 rounded border border-rose-500/10 animate-pulse font-mono">
                      🚨 RESCUE PROTOCOL PRE-ENGAGED
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {aiAnalysis.message}
                </p>
              </div>
            </div>

            {/* Risks List */}
            <div className="space-y-2 pt-3 border-t border-zinc-850">
              <span className="block text-[9px] font-bold text-zinc-500 font-mono uppercase tracking-widest">
                POTENTIAL BLOCKERS & RISKS
              </span>
              <div className="space-y-2">
                {aiAnalysis.risks.map((risk, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 text-xs p-2.5 rounded-lg border border-zinc-900 bg-zinc-950/40 text-zinc-400"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <span>{risk}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
