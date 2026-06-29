import React, { useState } from 'react';
import { ArrowRight, AlertTriangle, ShieldCheck, Hourglass, CheckCircle2, Plus, Archive, Target, Activity, CheckSquare } from 'lucide-react';
import type { Goal } from '../data/mockData';

interface DashboardProps {
  goals: Goal[];
  missionCommand?: any;
  onSelectGoal: (goalId: string) => void;
  onNavigateToCreate: () => void;
  onCompleteRecoveryStep: (goalId: string, stepId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  goals,
  missionCommand,
  onSelectGoal,
  onNavigateToCreate,
  onCompleteRecoveryStep,
}) => {
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");

  // Filter goals
  const activeGoals = goals.filter((g) => g.status !== "archived");
  const archivedGoals = goals.filter((g) => g.status === "archived");

  const rankedGoals = [...activeGoals].sort((a, b) => {
    if (a.daysRemaining !== b.daysRemaining) {
      return a.daysRemaining - b.daysRemaining;
    }

    return (
      (b.effectivePriorityScore || 0) -
      (a.effectivePriorityScore || 0)
    );
  });

  const currentList = activeTab === "active" ? rankedGoals : archivedGoals;
  const criticalGoals = activeGoals.filter(
    (g) => g.daysRemaining <= 14 || g.completionProbability < 50 || g.status === "critical",
  );
  const rescueGoal =
    criticalGoals.length > 0
      ? [...criticalGoals].sort((a, b) => a.daysRemaining - b.daysRemaining)[0]
      : undefined;

  // Safeguard ID replacement helper for mission text
  const resolveMissionText = (text: string): string => {
    if (!text) return "";
    let resolved = text;
    const idRegex = /g-\d+/g;
    const matches = text.match(idRegex);
    if (matches) {
      matches.forEach(id => {
        const matchGoal = goals.find(g => g.id === id);
        if (matchGoal) {
          resolved = resolved.replace(id, matchGoal.title);
        }
      });
    }
    return resolved;
  };

  // 6. Productivity Score Calculator
  const completedMilestonesCount = goals.reduce((acc, curr) => acc + curr.milestones.filter(m => m.status === 'completed').length, 0);
  const totalMilestonesCount = goals.reduce((acc, curr) => acc + curr.milestones.length, 0);
  const activeStreaksSum = goals.reduce((acc, curr) => acc + (curr.streak || 0), 0);
  const rescuedGoalsCount = goals.filter(g => g.status !== 'critical' && g.probabilityHistory && g.probabilityHistory.length > 1 && g.completionProbability > (g.probabilityHistory[0]?.probability || 50)).length;
  const overdueTasksCount = goals.reduce((acc, curr) => acc + curr.milestones.filter(m => {
    if (m.status !== 'pending' || !m.deadline) return false;
    return new Date(m.deadline).getTime() < new Date().setHours(0,0,0,0);
  }).length, 0);

  let completionPart = totalMilestonesCount > 0 ? Math.round((completedMilestonesCount / totalMilestonesCount) * 40) : 25;
  let streakBonus = Math.min(activeStreaksSum * 5, 20);
  let rescueBonus = Math.min(rescuedGoalsCount * 10, 25);
  let overduePenalty = Math.min(overdueTasksCount * 8, 25);
  let consistencyBonus = goals.length > 0 ? Math.round(goals.reduce((acc, curr) => acc + (curr.consistency || 0), 0) / goals.length * 0.15) : 15;

  let productivityScore = Math.max(0, Math.min(100, 40 + streakBonus + completionPart + rescueBonus - overduePenalty));

  // Effort extraction helper
  const extractHoursLocal = (effort: string): number => {
    const value = Number(effort.match(/(\d+)/)?.[1] || 1);
    if (effort.toLowerCase().includes("min")) {
      return value / 60;
    }
    return value;
  };

  // 4. Timeline View Intelligent Scheduler (Schedules work sessions realistically based on available capacity)
  const today = new Date();
  today.setHours(0,0,0,0);
  const todayMilestones: any[] = [];
  const tomorrowMilestones: any[] = [];
  const weekMilestones: any[] = [];

  activeGoals.forEach(goal => {
    const hoursPerDay = goal.availableHoursPerDay || 2;
    const pending = goal.milestones
      .filter(m => m.status === 'pending');
      
    // Track allocation across day indices: 0 = today, 1 = tomorrow, 2..7 = this week
    const dayAllocations = Array(8).fill(0);

    pending.forEach(m => {
      let effortLeft = extractHoursLocal(m.estimatedEffort);
      
      let startDay = 0;
      if (m.plannedScheduleDate) {
        const planned = new Date(m.plannedScheduleDate);
        planned.setHours(0,0,0,0);
        const diffDays = Math.round((planned.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        startDay = Math.max(0, diffDays);
      }

      let day = startDay;
      let todayShare = 0;
      let tomorrowShare = 0;
      const weekShares = Array(6).fill(0);

      while (effortLeft > 0.01 && day < 8) {
        const currentAllocated = dayAllocations[day];
        const space = hoursPerDay - currentAllocated;
        if (space > 0.01) {
          const allocate = Math.min(effortLeft, space);
          dayAllocations[day] += allocate;
          effortLeft -= allocate;

          if (day === 0) {
            todayShare += allocate;
          } else if (day === 1) {
            tomorrowShare += allocate;
          } else {
            weekShares[day - 2] += allocate;
          }
        }
        if (effortLeft > 0.01) {
          day++;
        }
      }

      const formatHrs = (h: number) => {
        if (h < 1) {
          return `${Math.round(h * 60)} min`;
        }
        return `${Number(h.toFixed(1))}h`;
      };

      // Build scheduled label
      const scheduledLabels: string[] = [];
      if (todayShare > 0) scheduledLabels.push(`Today: ${formatHrs(todayShare)}`);
      if (tomorrowShare > 0) scheduledLabels.push(`Tomorrow: ${formatHrs(tomorrowShare)}`);
      const weekTotal = weekShares.reduce((a, b) => a + b, 0);
      if (weekTotal > 0) scheduledLabels.push(`This Week: ${formatHrs(weekTotal)}`);

      const label = scheduledLabels.join(", ");

      if (todayShare > 0) {
        todayMilestones.push({
          ...m,
          goalId: goal.id,
          goalTitle: goal.title,
          scheduledLabel: label,
        });
      }
      if (tomorrowShare > 0) {
        tomorrowMilestones.push({
          ...m,
          goalId: goal.id,
          goalTitle: goal.title,
          scheduledLabel: label,
        });
      }
      if (weekTotal > 0) {
        weekMilestones.push({
          ...m,
          goalId: goal.id,
          goalTitle: goal.title,
          scheduledLabel: label,
        });
      }
    });
  });

  // EMPTY STATE FOR ALL GOALS
  if (goals.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-5 min-h-screen bg-zinc-950">
        <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 shadow-inner">
          <Target className="w-8 h-8" />
        </div>
        <div className="space-y-1.5 max-w-sm">
          <h2 className="text-xl font-bold text-white tracking-tight">
            Create your first goal to begin
          </h2>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Atlast is ready to monitor your deadlines, detect execution
            bottlenecks, and compute real-time recovery steps.
          </p>
        </div>
        <button
          onClick={onNavigateToCreate}
          className="py-2.5 px-6 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-500/10 hover:shadow-purple-500/20 transition-all duration-150 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>New Goal</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-screen bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-zinc-900">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-widest text-zinc-500 uppercase font-mono">
              Atlast AI Coach
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mt-1">
            {rescueGoal ? "Recovery Command" : "My Goals"}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Active vs Archived selector tabs */}
          <div className="flex items-center p-1 bg-zinc-900 border border-zinc-850 rounded-xl">
            <button
              onClick={() => setActiveTab("active")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === "active"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-350"
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>Active ({activeGoals.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("archived")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === "archived"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-350"
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Archived ({archivedGoals.length})</span>
            </button>
          </div>

          <button
            onClick={onNavigateToCreate}
            className="flex items-center gap-1.5 py-2 px-4 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-500/10 hover:shadow-purple-500/20 transition-all duration-150"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Goal</span>
          </button>
        </div>
      </div>
      {/* Agentic Score Panel */}
      {activeTab === "active" && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="glass-panel border-purple-500/20 bg-purple-500/10 rounded-2xl p-4 flex items-center justify-between shadow-[0_0_15px_rgba(168,85,247,0.08)] relative group cursor-help shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400 border border-purple-500/30">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-[10px] text-purple-400 font-bold uppercase tracking-wider font-mono">Productivity Score</span>
                <span className="text-2xl font-black text-white font-mono">{productivityScore}</span>
              </div>
            </div>
            
            {/* Hover Breakdown Popover */}
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 hidden group-hover:block w-48 glass-panel border-purple-500/30 bg-zinc-950 p-3 rounded-xl shadow-2xl z-50 text-[10px] font-mono space-y-1.5 text-zinc-400 border border-zinc-800 shadow-purple-950/20 animate-fade-in select-none">
              <span className="block text-purple-400 font-bold uppercase tracking-wider text-[8px] border-b border-zinc-900 pb-1 mb-1.5">Score Breakdown</span>
              <div className="flex justify-between"><span>Base Multiplier</span> <span className="text-white">40</span></div>
              <div className="flex justify-between"><span>Milestones Completion</span> <span className="text-emerald-400">+{completionPart}</span></div>
              <div className="flex justify-between"><span>Active Streaks</span> <span className="text-emerald-400">+{streakBonus}</span></div>
              <div className="flex justify-between"><span>Consistency Weight</span> <span className="text-emerald-400">+{consistencyBonus}</span></div>
              <div className="flex justify-between"><span>Rescue Recovery</span> <span className="text-emerald-400">+{rescueBonus}</span></div>
              {overduePenalty > 0 && (
                <div className="flex justify-between border-t border-zinc-900 pt-1 text-rose-400 font-bold"><span>Overdue Penalty</span> <span>-{overduePenalty}</span></div>
              )}
            </div>
          </div>
          <div className="glass-panel border-emerald-500/15 bg-emerald-500/5 rounded-2xl p-4 flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-mono">Goals Saved</span>
              <span className="text-xl font-extrabold text-white font-mono">
                {goals.filter(g => g.progress === 100 || (g.status === 'healthy' && g.milestones.some(m => m.status === 'completed'))).length}
              </span>
            </div>
          </div>
          <div className="glass-panel border-rose-500/15 bg-rose-500/5 rounded-2xl p-4 flex items-center gap-3">
            <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400 border border-rose-500/20">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-mono">Rescued</span>
              <span className="text-xl font-extrabold text-white font-mono">
                {goals.filter(g => g.status !== 'critical' && g.probabilityHistory && g.probabilityHistory.length > 1 && g.completionProbability > (g.probabilityHistory[0]?.probability || 50)).length}
              </span>
            </div>
          </div>
          <div className="glass-panel border-purple-500/15 bg-purple-500/5 rounded-2xl p-4 flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400 border border-purple-500/20">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-mono">Recoveries</span>
              <span className="text-xl font-extrabold text-white font-mono">
                {goals.filter(g => g.recoveryPlan).length}
              </span>
            </div>
          </div>
          <div className="glass-panel border-blue-500/15 bg-blue-500/5 rounded-2xl p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 border border-blue-500/20">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-mono">Avg Gain</span>
              <span className="text-xl font-extrabold text-white font-mono">
                +{goals.reduce((acc, curr) => {
                  const start = curr.probabilityHistory?.[0]?.probability || 50;
                  return acc + Math.max(0, curr.completionProbability - start);
                }, 0)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Smart Notifications Layer */}
      {activeTab === "active" && activeGoals.flatMap(g => g.notifications || []).length > 0 && (
        <div className="space-y-2">
          {activeGoals.flatMap(g => g.notifications || []).map((notif, idx) => (
            <div key={idx} className="glass-panel border-purple-500/10 bg-zinc-900/40 rounded-xl p-3.5 flex items-center gap-3 text-xs text-zinc-300 tracking-wide font-mono relative overflow-hidden">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse shrink-0" />
              <span>{notif}</span>
            </div>
          ))}
        </div>
      )}

      {/* 🚨 DEADLINE RESCUE MODE (Renders only if active goal is critical) */}
      {activeTab === "active" && rescueGoal && rescueGoal.recoveryPlan && (
        <div className="glass-panel border-rose-500/20 bg-rose-950/5 rounded-2xl p-6 relative overflow-hidden fade-in space-y-6">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-rose-500 via-amber-500 to-rose-600 shadow-[0_0_12px_rgba(244,63,94,0.3)]" />

          {/* Title */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-900 pb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_#f43f5e]" />
              <h2 className="text-base font-black tracking-wider uppercase font-mono text-rose-400">
                🚨 DEADLINE RESCUE PROTOCOL ENGAGED
              </h2>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-mono">
              <Hourglass
                className="w-3.5 h-3.5 text-amber-500 animate-spin"
                style={{ animationDuration: "4s" }}
              />
              <span>URGENT TIMELINE BUFFER CORRECTION</span>
            </div>
          </div>

          {/* Specs Details */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-2 space-y-2">
              <span className="text-[10px] font-bold text-zinc-500 font-mono uppercase tracking-wider block">
                At-Risk Goal
              </span>
              <h3
                onClick={() => onSelectGoal(rescueGoal.id)}
                className="text-lg font-bold text-white hover:text-purple-400 cursor-pointer transition-colors duration-150 flex items-center gap-1.5"
              >
                {rescueGoal.title}
                <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-purple-400" />
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {rescueGoal.description}
              </p>
            </div>

            <div className="space-y-1 md:border-l md:border-zinc-900 md:pl-6">
              <span className="text-[10px] font-bold text-zinc-500 font-mono uppercase tracking-wider block">
                Days Left
              </span>
              <span className="text-2xl font-extrabold text-white font-mono block">
                {rescueGoal.daysRemaining} Days
              </span>
              <span className="text-[10px] text-zinc-400 font-medium">
                Deadline:{" "}
                {new Date(rescueGoal.deadline).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>

            <div className="space-y-2 md:border-l md:border-zinc-900 md:pl-6">
              <span className="text-[10px] font-bold text-zinc-500 font-mono uppercase tracking-wider block">
                Current Bottleneck Risk
              </span>
              <div className="p-2.5 rounded-lg border border-rose-500/20 bg-rose-500/5 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="text-xs text-zinc-350 font-semibold leading-relaxed">
                  {rescueGoal.risks[0]?.title ||
                    "Tight deadline overlaps pending milestones."}
                </span>
              </div>
            </div>
          </div>

          {/* Progress Meter */}
          <div className="p-5 bg-zinc-950/60 border border-zinc-900 rounded-xl space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-500 font-bold uppercase tracking-wider">
                PROBABILITY RECOVERY METER
              </span>
              <div className="flex items-center gap-2">
                <span className="text-rose-400 font-extrabold font-mono text-sm">
                  {rescueGoal.completionProbability}% Chance
                </span>
                <span className="text-zinc-500">→</span>
                <span className="text-emerald-400 font-extrabold font-mono text-sm">
                  Target: {rescueGoal.recoveryPlan.expectedChance}%
                </span>
              </div>
            </div>

            {/* Recovery bar visuals */}
            <div className="w-full bg-zinc-900 h-3 rounded-full overflow-hidden border border-zinc-800 flex relative">
              <div
                className="bg-gradient-to-r from-rose-500 to-amber-500 h-full rounded-l-full relative transition-all duration-300"
                style={{ width: `${rescueGoal.completionProbability}%` }}
              />
              {rescueGoal.recoveryPlan.expectedChance >
                rescueGoal.completionProbability && (
                <div
                  className="bg-emerald-500/30 border-l border-dashed border-emerald-400 h-full relative animate-pulse transition-all duration-300"
                  style={{
                    width: `${rescueGoal.recoveryPlan.expectedChance - rescueGoal.completionProbability}%`,
                  }}
                />
              )}
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-zinc-400 font-mono uppercase tracking-wider">
              AI Recovery Action Checklist
            </h4>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {rescueGoal.recoveryPlan.steps.map((step) => {
                const isCompleted = step.status === "completed";

                return (
                  <div
                    key={step.id}
                    className={`p-4 border rounded-xl relative flex flex-col justify-between gap-4 transition-all duration-150 ${
                      isCompleted
                        ? "border-zinc-850 bg-zinc-950/40 opacity-60"
                        : "border-zinc-800 bg-zinc-900/10 hover:border-zinc-700/60"
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[9px] font-mono">
                        <span className="text-zinc-500 font-bold">
                          STEP {step.stepNumber} ({step.estimatedTime})
                        </span>
                        <span className="text-emerald-400 font-bold">
                          +{step.impact}% Chance
                        </span>
                      </div>

                      <h5 className="text-sm font-bold text-white leading-snug">
                        {step.action}
                      </h5>

                      <p className="text-xs text-zinc-400 leading-relaxed pt-1.5 border-t border-zinc-900">
                        {step.reason}
                      </p>
                    </div>

                    <button
                      onClick={() =>
                        onCompleteRecoveryStep(rescueGoal.id, step.id)
                      }
                      disabled={isCompleted}
                      className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-all duration-150 flex items-center justify-center gap-1.5 ${
                        isCompleted
                          ? "bg-zinc-850 border border-zinc-850 text-zinc-500 cursor-not-allowed"
                          : "bg-white hover:bg-zinc-200 text-zinc-950 shadow-sm"
                      }`}
                    >
                      {isCompleted ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Step Resolved</span>
                        </>
                      ) : (
                        <>
                          <span>Mark Complete</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Consequence alert box */}
          <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-xl space-y-2.5">
            <h4 className="text-xs font-bold text-rose-400 font-mono uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              What Happens If You Ignore This?
            </h4>
            <span className="block text-[9px] text-zinc-500 font-mono">
              AI projected outcome if no steps are completed within the next{" "}
              {rescueGoal.recoveryPlan.consequences.timeframe}:
            </span>
            <ul className="text-xs text-zinc-400 font-medium space-y-1.5 list-disc pl-4">
              {rescueGoal.recoveryPlan.consequences.points.map(
                (point, index) => (
                  <li key={index}>{point}</li>
                ),
              )}
            </ul>
          </div>
        </div>
      )}

      {/* 2. SECURED BANNER (If no rescue goal active) */}
      {activeTab === "active" && !rescueGoal && (
        <div className="glass-panel border-emerald-500/10 bg-emerald-500/5 rounded-2xl p-6 relative overflow-hidden fade-in flex items-start gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white">
              All Timelines Secured
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-xl">
              Your AI Coach is continuously scanning deadline parameters.
              Currently, all active goals are running on track and within safe
              probability margins.
            </p>
          </div>
        </div>
      )}

      {/* 3. TODAY'S MISSION & AI ALERTS */}
      {activeTab === "active" && activeGoals.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* TODAY'S MISSION (Feature 5) */}
          <div className="lg:col-span-2 glass-panel border border-purple-500/20 bg-purple-500/5 rounded-2xl p-6 flex flex-col justify-between space-y-4">
            <div>
              <h3 className="text-xs font-bold text-purple-400 uppercase tracking-widest font-mono mb-2 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-purple-400" />
                TODAY'S MISSION
              </h3>
              <p className="text-zinc-200 font-extrabold text-lg leading-snug">
                {resolveMissionText(missionCommand?.todayFocus) || (rescueGoal ? `Focus: Complete the nearest deadline step: "${rescueGoal.milestones.find(m => m.status === 'pending')?.title || 'Next milestone'}"` : "Focus: Complete your daily scheduled habit sessions.")}
              </p>
              <p className="text-zinc-400 text-xs mt-2 leading-relaxed font-medium">
                <strong>Reason:</strong> {resolveMissionText(missionCommand?.reasoning?.[0]) || (rescueGoal ? `The timeline buffer for "${rescueGoal.title}" has contracted to ${rescueGoal.daysRemaining} days remaining.` : "Keeps all execution paths secured.")}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold font-mono text-purple-400 pt-2 border-t border-zinc-900">
              <span>Expected Improvement:</span>
              <span className="text-emerald-400">
                {rescueGoal ? `+${rescueGoal.milestones.find(m => m.status === 'pending')?.priority === 'high' ? '18%' : '12%'} success probability` : "+6% success probability"}
              </span>
            </div>
          </div>

          {/* AI ALERTS (Feature 1) */}
          <div className="glass-panel border border-zinc-850 bg-zinc-900/30 rounded-2xl p-6 space-y-4">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-zinc-500" />
              AI ALERTS
            </h3>
            <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1">
              {goals.flatMap(g => g.notifications || []).length === 0 ? (
                <p className="text-zinc-550 text-[10px] font-mono italic">No outstanding alerts.</p>
              ) : (
                goals.flatMap(g => g.notifications || []).slice(0, 3).map((notif, idx) => (
                  <div key={idx} className="flex gap-2 text-[11px] text-zinc-450 leading-normal font-mono items-start">
                    <span className="text-amber-500 shrink-0 select-none">⚠️</span>
                    <span>{notif}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. CALENDAR TIMELINE VIEW (Feature 4) */}
      {activeTab === "active" && activeGoals.length > 0 && (
        <div className="glass-panel border border-zinc-900 rounded-2xl p-6 space-y-4">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-purple-400" />
            TIMELINE VIEW (LOCAL SCHEDULE)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* TODAY COLUMN */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-bold text-rose-400 tracking-wider font-mono uppercase border-b border-rose-500/10 pb-1.5 flex items-center justify-between">
                <span>Today</span>
                <span className="bg-rose-500/10 text-rose-400 px-1.5 py-0.5 rounded text-[8px] font-bold">{todayMilestones.length}</span>
              </h4>
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {todayMilestones.length === 0 ? (
                  <p className="text-[10px] text-zinc-600 font-mono italic">No tasks due today.</p>
                ) : (
                  todayMilestones.map((m, idx) => (
                    <div key={idx} onClick={() => onSelectGoal(m.goalId)} className="glass-panel border-zinc-850 hover:border-zinc-800 bg-zinc-900/40 p-2.5 rounded-xl text-xs space-y-1 cursor-pointer transition-all duration-150">
                      <span className="block text-[8px] text-zinc-500 font-bold uppercase tracking-wider truncate">{m.goalTitle}</span>
                      <p className="text-white font-semibold truncate">{m.title}</p>
                      <div className="flex flex-col gap-0.5 text-[9px] font-mono mt-1">
                        <span className="text-zinc-500">Total: {m.estimatedEffort}</span>
                        {m.scheduledLabel && <span className="text-purple-400 font-bold">Allocated: {m.scheduledLabel}</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* TOMORROW COLUMN */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-bold text-amber-400 tracking-wider font-mono uppercase border-b border-amber-500/10 pb-1.5 flex items-center justify-between">
                <span>Tomorrow</span>
                <span className="bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded text-[8px] font-bold">{tomorrowMilestones.length}</span>
              </h4>
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {tomorrowMilestones.length === 0 ? (
                  <p className="text-[10px] text-zinc-600 font-mono italic">No tasks due tomorrow.</p>
                ) : (
                  tomorrowMilestones.map((m, idx) => (
                    <div key={idx} onClick={() => onSelectGoal(m.goalId)} className="glass-panel border-zinc-850 hover:border-zinc-800 bg-zinc-900/40 p-2.5 rounded-xl text-xs space-y-1 cursor-pointer transition-all duration-150">
                      <span className="block text-[8px] text-zinc-500 font-bold uppercase tracking-wider truncate">{m.goalTitle}</span>
                      <p className="text-white font-semibold truncate">{m.title}</p>
                      <div className="flex flex-col gap-0.5 text-[9px] font-mono mt-1">
                        <span className="text-zinc-500">Total: {m.estimatedEffort}</span>
                        {m.scheduledLabel && <span className="text-purple-400 font-bold">Allocated: {m.scheduledLabel}</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* THIS WEEK COLUMN */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-bold text-purple-400 tracking-wider font-mono uppercase border-b border-purple-500/10 pb-1.5 flex items-center justify-between">
                <span>This Week</span>
                <span className="bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded text-[8px] font-bold">{weekMilestones.length}</span>
              </h4>
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {weekMilestones.length === 0 ? (
                  <p className="text-[10px] text-zinc-600 font-mono italic">No tasks due this week.</p>
                ) : (
                  weekMilestones.map((m, idx) => (
                    <div key={idx} onClick={() => onSelectGoal(m.goalId)} className="glass-panel border-zinc-850 hover:border-zinc-800 bg-zinc-900/40 p-2.5 rounded-xl text-xs space-y-1 cursor-pointer transition-all duration-150">
                      <span className="block text-[8px] text-zinc-500 font-bold uppercase tracking-wider truncate">{m.goalTitle}</span>
                      <p className="text-white font-semibold truncate">{m.title}</p>
                      <div className="flex flex-col gap-0.5 text-[9px] font-mono mt-1">
                        <span className="text-zinc-500">Total: {m.estimatedEffort}</span>
                        {m.scheduledLabel && <span className="text-purple-400 font-bold">Allocated: {m.scheduledLabel}</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-zinc-500 font-mono uppercase tracking-widest">
          {activeTab === "active" ? "Active Work" : "Archived Work"}
        </h3>

        {currentList.length === 0 ? (
          <div className="glass-panel border border-zinc-900 rounded-xl p-8 text-center text-zinc-500 text-xs font-mono">
            {activeTab === "active"
              ? "No active goals found."
              : "No archived goals found."}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {currentList.map((goal: Goal) => {
              const totalMs = goal.milestones.length;
              const pendingMs = goal.milestones.filter(
                (m) => m.status === "pending",
              );
              const completedMs = goal.milestones.filter(
                (m) => m.status === "completed",
              );

              const statusColors = {
                healthy: {
                  text: "text-emerald-400",
                  border: "border-emerald-500/10",
                  bg: "bg-emerald-500/5",
                  label: "On Track",
                  dot: "bg-emerald-500 indicator-dot-green",
                },
                "at-risk": {
                  text: "text-amber-400",
                  border: "border-amber-500/10",
                  bg: "bg-amber-500/5",
                  label: "Needs Work",
                  dot: "bg-amber-500 indicator-dot-amber",
                },
                critical: {
                  text: "text-rose-400",
                  border: "border-rose-500/15",
                  bg: "bg-rose-500/5",
                  label: "Behind Schedule",
                  dot: "bg-rose-500 indicator-dot-rose",
                },
                completed: {
                  text: "text-emerald-400",
                  border: "border-emerald-500/10",
                  bg: "bg-emerald-500/5",
                  label: "Completed",
                  dot: "bg-emerald-500 indicator-dot-green",
                },
                archived: {
                  text: "text-zinc-500",
                  border: "border-zinc-800",
                  bg: "bg-zinc-900/5",
                  label: "Archived",
                  dot: "bg-zinc-500",
                },
              }[goal.status];

              const priorityColors = {
                low: "bg-zinc-800 text-zinc-400 border-zinc-700/50",
                medium: "bg-purple-950/40 text-purple-400 border-purple-800/30",
                high: "bg-rose-950/40 text-rose-400 border-rose-800/30",
              }[goal.priority];

              return (
                <div
                  key={goal.id}
                  onClick={() => onSelectGoal(goal.id)}
                  className={`glass-panel glass-panel-hover rounded-xl p-5 border cursor-pointer relative overflow-hidden group ${
                    goal.id === rescueGoal?.id
                      ? "border-rose-500/20"
                      : "border-zinc-850 hover:border-zinc-800"
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5 max-w-xl">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${statusColors.dot}`}
                        />
                        <span className="text-[10px] font-bold font-mono tracking-widest text-zinc-500 uppercase">
                          {goal.category}
                        </span>
                        <span
                          className={`text-[9px] font-mono px-2 py-0.5 rounded border ${priorityColors}`}
                        >
                          {goal.priority.toUpperCase()}
                        </span>
                        {goal.goalType && (
                          <span
                            className={`text-[9px] font-mono px-2 py-0.5 rounded border uppercase ${
                              {
                                Skill: "bg-blue-950/40 text-blue-400 border-blue-800/30",
                                Exam: "bg-amber-950/40 text-amber-400 border-amber-800/30",
                                Project: "bg-purple-950/40 text-purple-400 border-purple-800/30",
                                Deadline: "bg-zinc-800/60 text-zinc-300 border-zinc-700/50",
                                Habit: "bg-emerald-950/40 text-emerald-400 border-emerald-800/30",
                              }[goal.goalType]
                            }`}
                          >
                            {goal.goalType}
                          </span>
                        )}

                        {goal.status === "critical" && (
                          <span className="text-[10px] text-rose-400 bg-rose-500/5 px-2 py-0.5 rounded border border-rose-500/10 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 animate-pulse" />
                            Blocker:{" "}
                            {goal.risks[0]?.title || "Timeline constraint"}
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-white group-hover:text-purple-400 transition-colors duration-150">
                        {goal.title}
                      </h3>
                      <p className="text-xs text-zinc-400 font-medium leading-relaxed line-clamp-2">
                        {goal.description}
                      </p>
                      {goal.coachingAdvice && (
                        <p className="text-[10px] text-zinc-500 italic mt-2 border-l border-purple-500/20 pl-2 leading-relaxed">
                          💡 {goal.coachingAdvice}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-6 shrink-0 font-mono">
                      {/* Deadlines */}
                      <div className="text-right">
                        <span className="block text-[9px] text-zinc-500 uppercase tracking-widest font-bold">
                          DEADLINE
                        </span>
                        <span className="text-sm font-bold text-white">
                          {goal.status === "completed"
                            ? "Finished"
                            : `${goal.daysRemaining} days left`}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="block text-[9px] text-zinc-500 uppercase tracking-widest font-bold">
                          PRIORITY SCORE
                        </span>

                        <span className="text-base font-black text-purple-400">
                          {goal.aiPriorityScore ?? goal.effectivePriorityScore}
                        </span>
                      </div>
                      {/* Probability */}
                      <div className="text-right flex flex-col justify-center items-end">
                        <span className="block text-[9px] text-zinc-500 uppercase tracking-widest font-bold">
                          SUCCESS CHANCE
                        </span>
                        <span
                          className={`text-base font-black ${statusColors.text}`}
                        >
                          {goal.completionProbability}%
                        </span>
                        {goal.probabilityConfidence && (
                          <span className={`text-[8px] font-mono font-bold uppercase mt-0.5 tracking-wider px-1 py-0.2 rounded border shrink-0 ${
                            goal.probabilityConfidence === 'HIGH' 
                              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/30' 
                              : goal.probabilityConfidence === 'MEDIUM'
                                ? 'bg-amber-950/40 text-amber-400 border-amber-800/30'
                                : 'bg-rose-950/40 text-rose-400 border-rose-800/30'
                          }`}>
                            {goal.probabilityConfidence}
                          </span>
                        )}
                      </div>

                      {/* Link arrow */}
                      <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:bg-purple-500/10 group-hover:border-purple-500/40 group-hover:text-purple-400 text-zinc-400 transition-all duration-150">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  {/* Milestones counts & Progress */}
                  <div className="mt-4 pt-3 border-t border-zinc-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-[10px] font-bold text-zinc-500 font-mono uppercase shrink-0">
                        Progress ({goal.progress}%)
                      </span>
                      <div className="flex-1 bg-zinc-900 rounded-full h-1 border border-zinc-850 overflow-hidden">
                        <div
                          className="bg-purple-500 rounded-full h-full"
                          style={{ width: `${goal.progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-500 shrink-0">
                      <span className="flex items-center gap-1">
                        <Activity className="w-3.5 h-3.5 text-zinc-600" />
                        Active: {pendingMs.length}
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
                        Completed: {completedMs.length} of {totalMs}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
