import React, { useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { BrainCircuit, TrendingUp, AlertTriangle, ShieldCheck, Flame, GitCommit, Edit, Trash2, Archive, CheckSquare, RotateCcw, Plus, ArrowUp, ArrowDown, CheckCircle2 } from 'lucide-react';
import type { Goal, Milestone } from '../data/mockData';
import { InsightsPanel } from '../components/InsightsPanel';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { GoalModal } from '../components/GoalModal';
import { MilestoneModal } from '../components/MilestoneModal';

interface GoalIntelligenceProps {
  goals: Goal[];
  selectedGoalId: string;
  onSelectGoal: (goalId: string) => void;
  onCompleteRecoveryStep: (goalId: string, stepId: string) => void;
  onUpdateGoal: (goalId: string, goalData: Partial<Goal>) => void;
  onDeleteGoal: (goalId: string) => void;
  onArchiveGoal: (goalId: string) => void;
  onReopenGoal: (goalId: string) => void;
  onAddMilestone: (goalId: string, milestoneData: Omit<Milestone, 'id' | 'status'>) => void;
  onUpdateMilestone: (goalId: string, milestoneId: string, milestoneData: Partial<Milestone>) => void;
  onDeleteMilestone: (goalId: string, milestoneId: string) => void;
  onCompleteMilestone: (goalId: string, milestoneId: string) => void;
  onRevertMilestone: (goalId: string, milestoneId: string) => void;
  onReorderMilestones: (goalId: string, startIndex: number, endIndex: number) => void;
  onAcceptReplanning: (goalId: string) => void;
}

export const GoalIntelligence: React.FC<GoalIntelligenceProps> = ({
  goals,
  selectedGoalId,
  onSelectGoal,
  onCompleteRecoveryStep,
  onUpdateGoal,
  onDeleteGoal,
  onArchiveGoal,
  onReopenGoal,
  onAddMilestone,
  onUpdateMilestone,
  onDeleteMilestone,
  onCompleteMilestone,
  onRevertMilestone,
  onReorderMilestones,
  onAcceptReplanning
}) => {
  // Modal states
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | undefined>(undefined);
  
  // Delete confirm modal state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: 'goal' | 'milestone';
    milestoneId?: string;
    message: string;
  }>({
    isOpen: false,
    type: 'goal',
    message: ''
  });

  const currentGoal = goals.find(g => g.id === selectedGoalId) || goals[0];

  const getStatusColor = (status: Goal['status']) => {
    switch (status) {
      case 'healthy': return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
      case 'at-risk': return 'text-amber-400 border-amber-500/20 bg-amber-500/5';
      case 'completed': return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
      case 'archived': return 'text-zinc-500 border-zinc-800 bg-zinc-900/5';
      default: return 'text-rose-400 border-rose-500/20 bg-rose-500/5';
    }
  };

  const getPriorityStyle = (priority: Goal['priority'] | Milestone['priority']) => {
    switch (priority) {
      case 'high': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      case 'medium': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      default: return 'text-zinc-400 bg-zinc-800/40 border-zinc-700/30';
    }
  };

  if (!currentGoal) {
    return (
      <div className="flex-1 p-6 flex flex-col items-center justify-center text-center space-y-3 min-h-screen bg-zinc-950">
        <BrainCircuit className="w-12 h-12 text-zinc-650 animate-pulse" />
        <h2 className="text-lg font-bold text-white">No Active Goals</h2>
        <p className="text-sm text-zinc-500 font-mono">Create a goal in the Dashboard to inspect insights.</p>
      </div>
    );
  }

  // Filter milestones
  const activeMilestones = currentGoal.milestones.filter(m => m.status === 'pending');
  const completedMilestones = currentGoal.milestones.filter(m => m.status === 'completed');

  // Trigger Goal save
  const handleSaveGoal = (goalData: { title: string; description: string; deadline: string; priority: 'low' | 'medium' | 'high'; category: string }) => {
    onUpdateGoal(currentGoal.id, goalData);
  };

  // Trigger Milestone save
  const handleSaveMilestone = (milestoneData: { title: string; description: string; deadline: string; estimatedEffort: string; priority: 'low' | 'medium' | 'high' }) => {
    if (editingMilestone) {
      onUpdateMilestone(currentGoal.id, editingMilestone.id, milestoneData);
    } else {
      onAddMilestone(currentGoal.id, milestoneData);
    }
    setEditingMilestone(undefined);
  };

  // Trigger Delete confirmation
  const triggerDeleteGoal = () => {
    setDeleteConfirm({
      isOpen: true,
      type: 'goal',
      message: `Are you sure you want to permanently delete the goal "${currentGoal.title}"? This will erase all history and milestones.`
    });
  };

  const triggerDeleteMilestone = (milestoneId: string, title: string) => {
    setDeleteConfirm({
      isOpen: true,
      type: 'milestone',
      milestoneId,
      message: `Are you sure you want to permanently delete the milestone "${title}"?`
    });
  };

  const handleConfirmDelete = () => {
    if (deleteConfirm.type === 'goal') {
      onDeleteGoal(currentGoal.id);
      // Take back to Dashboard
        } else if (deleteConfirm.type === 'milestone' && deleteConfirm.milestoneId) {
      onDeleteMilestone(currentGoal.id, deleteConfirm.milestoneId);
    }
    setDeleteConfirm({ isOpen: false, type: 'goal', message: '' });
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-screen bg-zinc-950">
      
      {/* Top Header / Action Bar */}
      <div className="pb-6 border-b border-zinc-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-widest text-zinc-500 uppercase font-mono">
              Goal Manager
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mt-1">
            Goal Insights
          </h1>
        </div>

        {/* Goal Selector tabs */}
        <div className="flex items-center gap-2 bg-zinc-900 p-1 rounded-xl border border-zinc-850 overflow-x-auto max-w-full">
          {goals.map((g) => (
            <button
              key={g.id}
              onClick={() => onSelectGoal(g.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg shrink-0 transition-all font-mono ${
                g.id === currentGoal.id
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-350'
              }`}
            >
              {g.title.length > 20 ? `${g.title.slice(0, 17)}...` : g.title}
            </button>
          ))}
        </div>
      </div>

      {/* Goal Administration Actions Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-zinc-900/20 border border-zinc-850 rounded-xl">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold font-mono tracking-widest border px-2 py-0.5 rounded ${getStatusColor(currentGoal.status)}`}>
            {currentGoal.status === 'healthy' ? 'ON TRACK' : currentGoal.status === 'at-risk' ? 'NEEDS WORK' : currentGoal.status === 'completed' ? 'COMPLETED' : currentGoal.status === 'archived' ? 'ARCHIVED' : 'BEHIND'}
          </span>
          <span className={`text-[10px] font-bold font-mono border px-2 py-0.5 rounded ${getPriorityStyle(currentGoal.priority)}`}>
            {currentGoal.priority.toUpperCase()} PRIORITY
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Edit */}
          <button
            onClick={() => setIsGoalModalOpen(true)}
            className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900/60 text-zinc-300 text-xs font-semibold transition-all"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>

          {/* Archive / Reopen */}
          {currentGoal.status === 'archived' ? (
            <button
              onClick={() => onReopenGoal(currentGoal.id)}
              className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-zinc-850 hover:border-zinc-800 bg-zinc-900/60 text-emerald-400 text-xs font-semibold transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reopen Goal</span>
            </button>
          ) : (
            <button
              onClick={() => onArchiveGoal(currentGoal.id)}
              className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900/60 text-zinc-400 text-xs font-semibold transition-all"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Archive Goal</span>
            </button>
          )}

          {/* Delete */}
          <button
            onClick={triggerDeleteGoal}
            className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-rose-500/10 hover:border-rose-500/30 bg-rose-500/5 text-rose-400 text-xs font-semibold transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Main Grid split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Summary & Milestones (Span 2) */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI REPLANNING RECOMMENDATION (Feature 2) */}
          {currentGoal.replanningProposal && (
            <div className="glass-panel border-purple-500/30 bg-purple-950/10 rounded-xl p-5 space-y-4 shadow-[0_0_15px_rgba(168,85,247,0.08)]">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                <div className="flex items-center gap-2">
                  <BrainCircuit className="w-4 h-4 text-purple-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-purple-400">
                    AI Replanning Recommendation
                  </h3>
                </div>
                <span className="text-[9px] text-zinc-500 font-mono">
                  PROPOSAL ACTIVE
                </span>
              </div>
              
              <div className="space-y-2">
                <p className="text-xs text-zinc-300">
                  We detected <strong className="text-rose-450">{currentGoal.replanningProposal.daysShifted} overdue milestone(s)</strong>. 
                  Accepting this proposal will automatically reschedule these tasks to today and redistribute your remaining workload.
                </p>
                <div className="flex items-center gap-2 text-xs font-bold font-mono pt-1 text-emerald-455">
                  <span>Expected Improvement:</span>
                  <span>+{currentGoal.replanningProposal.daysShifted * 8}% Success Chance</span>
                </div>
              </div>

              <button
                onClick={() => onAcceptReplanning(currentGoal.id)}
                className="w-full py-2 px-4 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-500/10 hover:shadow-purple-500/20 transition-all duration-150 flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Accept Replanning</span>
              </button>
            </div>
          )}

          {/* Summary Details */}
          <div className="glass-panel border border-zinc-800 rounded-xl p-5 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">{currentGoal.title}</h2>
              <p className="text-sm text-zinc-400 mt-2 leading-relaxed">{currentGoal.description}</p>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-zinc-900 font-mono text-center">
              <div>
                <span className="block text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Days Remaining</span>
                <span className="text-base font-extrabold text-white">
                  {currentGoal.status === 'completed' ? 'Done' : `${currentGoal.daysRemaining} Days`}
                </span>
              </div>
              <div>
                <span className="block text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Likelihood</span>
                <span className="text-base font-extrabold text-purple-400">{currentGoal.completionProbability}%</span>
              </div>
              <div>
                <span className="block text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Goal Health</span>
                <span className="text-base font-extrabold text-white">{currentGoal.missionHealthScore}%</span>
              </div>
            </div>

            {/* Agentic Reasoning Panel */}
            {currentGoal.probabilityConfidence && (
              <div className="pt-4 border-t border-zinc-900/60 font-mono text-left space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500 font-bold uppercase tracking-wider text-[9px]">Confidence Rating</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                    currentGoal.probabilityConfidence === 'HIGH' 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                      : currentGoal.probabilityConfidence === 'MEDIUM'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}>
                    {currentGoal.probabilityConfidence}
                  </span>
                </div>
                <div className="bg-zinc-950/40 border border-zinc-900 rounded-xl p-3 text-[11px] text-zinc-400 space-y-1">
                  <span className="block text-zinc-500 font-bold uppercase tracking-wider text-[8px] mb-1">AI Calculation Log</span>
                  {currentGoal.probabilityExplanation ? (
                    currentGoal.probabilityExplanation.split('\n').map((line, lIdx) => (
                      <div key={lIdx} className="flex items-center gap-1.5 leading-relaxed">
                        <span className="text-purple-400 shrink-0">•</span>
                        <span>{line.replace(/^•\s*/, '')}</span>
                      </div>
                    ))
                  ) : (
                    <span>No logs loaded.</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* AI RESCUE/IMPROVEMENT PROTOCOL */}
          {currentGoal.recoveryPlan && currentGoal.status !== 'completed' && (
            <div className={`glass-panel rounded-xl p-5 space-y-4 fade-in border ${
              currentGoal.status === 'critical' ? 'border-rose-500/20 bg-rose-950/5' : 'border-emerald-500/20 bg-emerald-950/5'
            }`}>
              <div className="flex items-center gap-2 border-b border-zinc-900 pb-3">
                {currentGoal.status === 'critical' ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_#f43f5e]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-rose-400">
                      🚨 AI RECOVERY PROTOCOL
                    </h3>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-emerald-400">
                      💡 AI IMPROVEMENT PLAN
                    </h3>
                  </>
                )}
              </div>
              
              <div className="space-y-3">
                {currentGoal.recoveryPlan.steps.map((step) => {
                  const isCompleted = step.status === 'completed';
                  return (
                    <div key={step.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-zinc-950/40 border border-zinc-900 rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[9px] font-bold text-zinc-500 font-mono">
                            STEP {step.stepNumber} ({step.estimatedTime})
                          </span>
                          <span className={`text-[9px] font-bold font-mono ${
                            currentGoal.status === 'critical' ? 'text-rose-400' : 'text-emerald-400'
                          }`}>
                            +{step.impact}% Chance
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-white">{step.action}</h4>
                        <p className="text-xs text-zinc-400">{step.reason}</p>
                      </div>
                      
                      <button
                        onClick={() => onCompleteRecoveryStep(currentGoal.id, step.id)}
                        disabled={isCompleted}
                        className={`py-1.5 px-3 rounded-lg text-xs font-bold shrink-0 transition-all ${
                          isCompleted
                            ? 'bg-zinc-850 border border-zinc-850 text-zinc-500 cursor-not-allowed'
                            : 'bg-white hover:bg-zinc-200 text-zinc-950 shadow-sm'
                        }`}
                      >
                        {isCompleted ? 'Resolved' : 'Mark Complete'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ACTIVE WORK SECTION */}
          <div className="glass-panel border border-zinc-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-900">
              <h3 className="text-xs font-bold tracking-wider font-mono text-zinc-400 flex items-center gap-1.5">
                <GitCommit className="w-4 h-4 text-purple-500" />
                Active Work (Pending Milestones)
              </h3>
              
              <button
                onClick={() => {
                  setEditingMilestone(undefined);
                  setIsMilestoneModalOpen(true);
                }}
                className="flex items-center gap-1 py-1 px-2.5 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900/50 text-white text-[11px] font-bold transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Milestone</span>
              </button>
            </div>

            {activeMilestones.length === 0 ? (
              <div className="py-8 text-center space-y-3">
                <p className="text-xs text-zinc-500 font-mono">No active milestones created yet.</p>
                <button
                  onClick={() => {
                    setEditingMilestone(undefined);
                    setIsMilestoneModalOpen(true);
                  }}
                  className="py-1.5 px-4 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-white text-xs font-bold transition-all inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 text-zinc-400" />
                  Add Milestone
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {activeMilestones.map((ms, index) => {
                  return (
                    <div
                      key={ms.id}
                      className="p-4 bg-zinc-900/10 border border-zinc-900 rounded-xl hover:border-zinc-850 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                    >
                      {/* Left: Info */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Checkbox to complete */}
                          <button
                            onClick={() =>
                              onCompleteMilestone(currentGoal.id, ms.id)
                            }
                            className="w-4.5 h-4.5 rounded border border-zinc-800 bg-zinc-950 flex items-center justify-center hover:border-purple-500 transition-all shrink-0"
                          >
                            <div className="w-2 h-2 rounded-sm bg-transparent" />
                          </button>

                          <div className="flex flex-col">
                            {ms.day && (
                              <span className="text-[9px] font-bold text-cyan-400 font-mono uppercase">
                                Day {ms.day}
                              </span>
                            )}

                            <span className="text-sm font-bold text-white leading-snug">
                              {ms.title}
                            </span>
                          </div>
                          <span
                            className={`text-[8px] font-bold font-mono px-1.5 py-0.2 rounded border ${getPriorityStyle(ms.priority)}`}
                          >
                            {ms.priority.toUpperCase()}
                          </span>
                          {ms.estimatedEffort && (
                            <span className="text-[9px] text-zinc-500 font-mono font-semibold">
                              Est: {ms.estimatedEffort}
                            </span>
                          )}
                        </div>
                        {ms.description && (
                          <p className="text-xs text-zinc-400 leading-relaxed pl-6">
                            {ms.description}
                          </p>
                        )}
                        <span className="block text-[9px] text-zinc-500 font-mono pl-6">
                          Due Date:{" "}
                          {new Date(ms.deadline).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>

                      {/* Right: sorting & editing tools */}
                      <div className="flex items-center gap-1.5 sm:self-center shrink-0 pl-6 sm:pl-0">
                        {/* Reorder actions */}
                        <button
                          disabled={index === 0}
                          onClick={() => {
                            const currentActualIndex = currentGoal.milestones.findIndex(m => m.id === ms.id);
                            const targetActualIndex = currentGoal.milestones.findIndex(m => m.id === activeMilestones[index - 1].id);
                            if (currentActualIndex !== -1 && targetActualIndex !== -1) {
                              onReorderMilestones(currentGoal.id, currentActualIndex, targetActualIndex);
                            }
                          }}
                          className="p-1 rounded bg-zinc-900/60 border border-zinc-850 hover:bg-zinc-850 text-zinc-400 disabled:opacity-30 disabled:pointer-events-none transition-all"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          disabled={index === activeMilestones.length - 1}
                          onClick={() => {
                            const currentActualIndex = currentGoal.milestones.findIndex(m => m.id === ms.id);
                            const targetActualIndex = currentGoal.milestones.findIndex(m => m.id === activeMilestones[index + 1].id);
                            if (currentActualIndex !== -1 && targetActualIndex !== -1) {
                              onReorderMilestones(currentGoal.id, currentActualIndex, targetActualIndex);
                            }
                          }}
                          className="p-1 rounded bg-zinc-900/60 border border-zinc-850 hover:bg-zinc-850 text-zinc-400 disabled:opacity-30 disabled:pointer-events-none transition-all"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit milestone */}
                        <button
                          onClick={() => {
                            setEditingMilestone(ms);
                            setIsMilestoneModalOpen(true);
                          }}
                          className="p-1 rounded bg-zinc-900/60 border border-zinc-850 hover:bg-zinc-850 text-zinc-300 transition-all ml-1.5"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete milestone */}
                        <button
                          onClick={() =>
                            triggerDeleteMilestone(ms.id, ms.title)
                          }
                          className="p-1 rounded bg-rose-500/5 border border-rose-500/10 hover:border-rose-500/30 text-rose-400 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* COMPLETED WORK SECTION */}
          <div className="glass-panel border border-zinc-800 rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-bold tracking-wider font-mono text-zinc-400 flex items-center gap-1.5 pb-3 border-b border-zinc-900">
              <CheckSquare className="w-4 h-4 text-emerald-400" />
              Completed Work (Milestone History)
            </h3>

            {completedMilestones.length === 0 ? (
              <div className="py-6 text-center text-zinc-500 text-xs font-mono">
                No milestones completed yet. Check off items in Active Work to populate this list.
              </div>
            ) : (
              <div className="space-y-3.5">
                {completedMilestones.map((ms) => {
                  return (
                    <div 
                      key={ms.id}
                      className="p-4 bg-zinc-950/40 border border-zinc-900/60 rounded-xl opacity-75 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span className="text-sm font-bold text-zinc-300 line-through leading-snug">{ms.title}</span>
                        </div>
                        {ms.completedAt && (
                          <span className="block text-[9px] text-zinc-500 font-mono pl-6">
                            Completed on: {new Date(ms.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0 pl-6 sm:pl-0">
                        {/* Revert / Reopen milestone */}
                        <button
                          onClick={() => onRevertMilestone(currentGoal.id, ms.id)}
                          className="flex items-center gap-1 py-1 px-2.5 rounded-lg border border-zinc-850 hover:border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:text-zinc-200 text-[10px] font-bold font-mono transition-all"
                        >
                          <RotateCcw className="w-3 h-3 text-zinc-500" />
                          Reopen
                        </button>

                        {/* Delete milestone */}
                        <button
                          onClick={() => triggerDeleteMilestone(ms.id, ms.title)}
                          className="p-1 rounded bg-rose-500/5 border border-rose-500/10 hover:border-rose-500/20 text-rose-450 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Analytics Probability trend chart */}
          {currentGoal.probabilityHistory && currentGoal.probabilityHistory.length > 0 && (
            <div className="glass-panel border border-zinc-800 rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-bold tracking-wider font-mono text-zinc-400 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-purple-500" />
                Completion Likelihood Telemetry
              </h3>
              
              <div className="h-52 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={currentGoal.probabilityHistory} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(63, 63, 70, 0.1)" vertical={false} />
                    <XAxis dataKey="date" stroke="#52525b" fontSize={10} tickLine={false} fontFamily="JetBrains Mono" />
                    <YAxis stroke="#52525b" fontSize={10} tickLine={false} domain={[0, 100]} fontFamily="JetBrains Mono" />
                    <Tooltip
                      contentStyle={{
                        background: '#09090b',
                        border: '1px solid rgba(168, 85, 247, 0.2)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '11px',
                        fontFamily: 'JetBrains Mono',
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="probability" 
                      stroke="#a855f7" 
                      strokeWidth={2}
                      dot={{ fill: '#09090b', stroke: '#a855f7', strokeWidth: 1.5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Risk indicators & AI advice */}
        <div className="space-y-6">
          {/* HABIT PROGRESS CARD (Feature 3) */}
          {currentGoal.goalType === 'Habit' && (
            <div className="glass-panel border-emerald-500/20 bg-emerald-500/5 rounded-xl p-5 space-y-4 shadow-[0_0_15px_rgba(16,185,129,0.06)] bg-gradient-to-br from-zinc-950 via-zinc-950 to-emerald-950/10">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-850">
                <h3 className="text-xs font-bold tracking-wider uppercase font-mono text-emerald-400 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-emerald-400 animate-pulse" />
                  Habit Tracking
                </h3>
                <span className="text-[9px] font-mono text-zinc-500">
                  Daily Habit Check-in
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-900">
                  <span className="block text-[8px] text-zinc-505 uppercase tracking-widest font-mono">Current Streak</span>
                  <span className="text-sm font-black text-white font-mono mt-1 block">🔥 {currentGoal.streak || 0}d</span>
                </div>
                <div className="bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-900">
                  <span className="block text-[8px] text-zinc-505 uppercase tracking-widest font-mono">Best Streak</span>
                  <span className="text-sm font-black text-white font-mono mt-1 block">⭐ {currentGoal.bestStreak || 0}d</span>
                </div>
                <div className="bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-900">
                  <span className="block text-[8px] text-zinc-505 uppercase tracking-widest font-mono">Consistency</span>
                  <span className="text-sm font-black text-purple-400 font-mono mt-1 block">📈 {currentGoal.consistency || 0}%</span>
                </div>
              </div>
              <div className="text-[10px] text-zinc-550 leading-normal text-center italic font-mono pt-1">
                Completed {currentGoal.sessionsCompleted} sessions. Target: 100% check-in rate.
              </div>
            </div>
          )}

          {/* AI REPLANNING HISTORY (Feature 2) */}
          {currentGoal.replannedHistory && currentGoal.replannedHistory.length > 0 && (
            <div className="glass-panel border border-zinc-800 bg-gradient-to-br from-zinc-950 via-zinc-950 to-purple-950/5 rounded-xl p-5 space-y-4 shadow-[0_0_12px_rgba(168,85,247,0.04)]">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-850">
                <h3 className="text-xs font-bold tracking-wider uppercase font-mono text-zinc-400 flex items-center gap-1.5">
                  <BrainCircuit className="w-4 h-4 text-purple-400" />
                  AI Replanning History
                </h3>
              </div>
              
              <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1">
                {currentGoal.replannedHistory.map((log, idx) => (
                  <div key={idx} className="flex gap-2 text-[10px] text-zinc-450 font-mono items-start">
                    <span className="text-purple-500 shrink-0 select-none">⚡</span>
                    <span className="leading-relaxed">{log}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottlenecks Registry */}
          <div className="glass-panel border border-zinc-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-850">
              <h3 className="text-xs font-bold tracking-wider uppercase font-mono text-zinc-400 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-zinc-500" />
                Active Bottlenecks
              </h3>
              <span className="text-[9px] font-mono text-zinc-500">
                {currentGoal.risks.length} threats tracked
              </span>
            </div>

            {currentGoal.risks.length === 0 ? (
              <div className="py-6 text-center space-y-2">
                <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto opacity-75" />
                <p className="text-xs text-zinc-400 font-semibold">Zero bottlenecks active</p>
                <p className="text-[10px] text-zinc-500">Goal parameters are running smoothly.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {currentGoal.risks.map((risk) => {
                  const riskLevel = risk.level;
                  const borderClass = riskLevel === 'high' ? 'border-rose-500/20 bg-rose-500/5' : 'border-amber-500/20 bg-amber-500/5';
                  const textClass = riskLevel === 'high' ? 'text-rose-400' : 'text-amber-400';

                  return (
                    <div key={risk.id} className={`p-4 border rounded-xl space-y-3 ${borderClass}`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <span className={`text-[9px] font-bold font-mono uppercase tracking-wider ${textClass}`}>
                            {riskLevel} severity
                          </span>
                          <h4 className="text-sm font-bold text-white mt-0.5 leading-snug">{risk.title}</h4>
                        </div>
                        <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${textClass}`} />
                      </div>

                      <div className="text-xs space-y-1.5 text-zinc-400 font-medium">
                        <p>
                          <strong className="text-zinc-300 font-mono text-[9px] block uppercase tracking-wider">Blocker:</strong>
                          {risk.bottleneck}
                        </p>
                        <p className="pt-1.5 border-t border-zinc-900">
                          <strong className="text-zinc-300 font-mono text-[9px] block uppercase tracking-wider">Suggested Focus:</strong>
                          {risk.intervention}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* AI Coach suggestions */}
          <InsightsPanel
            recommendations={currentGoal.recommendations}
          />
        </div>

      </div>

      {/* MODALS */}
      
      {/* 1. Goal edit modal */}
      <GoalModal
        isOpen={isGoalModalOpen}
        goal={currentGoal}
        onSave={handleSaveGoal}
        onClose={() => setIsGoalModalOpen(false)}
      />

      {/* 2. Milestone edit/add modal */}
      <MilestoneModal
        isOpen={isMilestoneModalOpen}
        milestone={editingMilestone}
        onSave={handleSaveMilestone}
        onClose={() => {
          setIsMilestoneModalOpen(false);
          setEditingMilestone(undefined);
        }}
      />

      {/* 3. Reusable Delete Confirmation modal */}
      <ConfirmationModal
        isOpen={deleteConfirm.isOpen}
        title={`Confirm Delete`}
        message={deleteConfirm.message}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, type: 'goal', message: '' })}
      />

    </div>
  );
};
