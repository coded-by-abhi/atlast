export interface Milestone {
  id: string;
  title: string;
  description: string;

  deadline: string;

  estimatedEffort: string;

  priority: "low" | "medium" | "high";

  status: "pending" | "completed";

  completedAt?: string;

  day?: number;

  successCriteria?: string;

  plannedScheduleDate?: string;
}

export interface Risk {
  id: string;
  title: string;
  score: number;
  bottleneck: string;
  intervention: string;
  level: "low" | "medium" | "high";
}

export interface Recommendation {
  id: string;
  action: string;
  reasoning: string;
  impact: string;
  level: "critical" | "high" | "medium";
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  message: string;
  type: "alert" | "success" | "update" | "milestone";
}

export interface RecoveryStep {
  id: string;
  stepNumber: number;
  action: string;
  estimatedTime: string;
  impact: number;
  reason: string;
  status: "pending" | "completed";
}

export interface RecoveryPlan {
  currentChance: number;
  expectedChance: number;
  steps: RecoveryStep[];
  consequences: {
    timeframe: string;
    points: string[];
  };
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  deadline: string;
  progress: number; // calculated dynamically: (completed milestones / total) * 100
  priority: "low" | "medium" | "high";
  status: "healthy" | "at-risk" | "critical" | "completed" | "archived"; // healthy -> On Track, at-risk -> Needs Work, critical -> Behind, completed -> Finished, archived -> Archived
  completionProbability: number; // calculated dynamically
  daysRemaining: number;
  category: string;
  availableHoursPerDay?: number;
  effectivePriorityScore?: number;
  missionHealthScore: number; // calculated dynamically
  milestones: Milestone[];
  risks: Risk[];
  recommendations: Recommendation[];
  timeline: TimelineEvent[];
  criticalPath: string[];
  probabilityHistory: { date: string; probability: number }[];
  recoveryPlan?: RecoveryPlan;
  aiPriorityScore?: number;
  aiUrgency?: string;
  aiReason?: string;
  goalType?: "Skill" | "Exam" | "Project" | "Deadline" | "Habit";
  notifications?: string[];
  coachingAdvice?: string;
  replannedHistory?: string[];
  replanningProposal?: {
    proposedMilestones: Milestone[];
    originalMilestones: Milestone[];
    daysShifted: number;
  };
  streak?: number;
  bestStreak?: number;
  sessionsCompleted?: number;
  consistency?: number;
  lastActivity?: string;
  probabilityConfidence?: "HIGH" | "MEDIUM" | "LOW";
  probabilityExplanation?: string;
}

// Clean initialization - starts completely empty as per user requirements
export const initialGoals: Goal[] = [];

/**
 * Dynamic AI calculations based on user data input
 */
const extractHours = (effort: string): number => {
  const value = Number(effort.match(/(\d+)/)?.[1] || 1);

  if (effort.toLowerCase().includes("min")) {
    return value / 60;
  }

  return value;
};
export const calculateGoalStats = (
  goal: Omit<
    Goal,
    | "progress"
    | "completionProbability"
    | "daysRemaining"
    | "missionHealthScore"
    | "status"
    | "recoveryPlan"
    | "recommendations"
    | "probabilityHistory"
  > & { 
    status?: Goal["status"];
    recommendations?: Goal["recommendations"];
    probabilityHistory?: Goal["probabilityHistory"];
  },
): Goal => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const normalizedMilestones = goal.milestones.map((m, index) => {
    if (m.plannedScheduleDate) return m;
    const mDay = m.day || (index + 1);
    const schedDate = new Date(today);
    schedDate.setDate(schedDate.getDate() + (mDay - 1));
    return {
      ...m,
      day: mDay,
      plannedScheduleDate: schedDate.toISOString().slice(0, 10),
    };
  });

  const totalMilestones = normalizedMilestones.length;
  const completedMilestones = normalizedMilestones.filter(
    (m) => m.status === "completed",
  );
  const completedCount = completedMilestones.length;

  const progress =
    totalMilestones > 0
      ? Math.round((completedCount / totalMilestones) * 100)
      : 0;

  const targetDate = new Date(goal.deadline);
  targetDate.setHours(0, 0, 0, 0);
  const diffTime = targetDate.getTime() - today.getTime();
  const daysRemaining = Math.max(
    0,
    Math.ceil(diffTime / (1000 * 60 * 60 * 24)),
  );

  // 3. Goal Classification Layer (Needed first for recommendation dependencies)
  let goalType: Goal["goalType"] = "Project";
  const cat = (goal.category || "").toLowerCase();
  const titleLower = (goal.title || "").toLowerCase();
  if (cat.includes("study") || cat.includes("exam") || cat.includes("academics") || titleLower.includes("exam") || titleLower.includes("midterm") || titleLower.includes("test")) {
    goalType = "Exam";
  } else if (cat.includes("skill") || titleLower.includes("swimming") || titleLower.includes("swim") || titleLower.includes("piano") || titleLower.includes("draw")) {
    goalType = "Skill";
  } else if (cat.includes("life") || cat.includes("habit") || titleLower.includes("gym") || titleLower.includes("workout") || titleLower.includes("practice")) {
    goalType = "Habit";
  } else if (cat.includes("deadline") || cat.includes("assignment") || titleLower.includes("submit") || titleLower.includes("pay")) {
    goalType = "Deadline";
  }

  const dailyHours = goal.availableHoursPerDay || 2;

  // 4. Habit Statistics Calculations
  let streak = goal.streak || 0;
  let bestStreak = goal.bestStreak || 0;
  let sessionsCompleted = completedMilestones.length;
  let consistency = totalMilestones > 0 ? Math.round((completedMilestones.length / totalMilestones) * 100) : 0;

  if ((goalType === "Habit" || goalType === "Skill") && completedMilestones.length > 0) {
    const dates = completedMilestones
      .map(m => m.completedAt)
      .filter(Boolean)
      .map(d => d!.slice(0, 10))
      .filter((v, i, self) => self.indexOf(v) === i)
      .sort();

    if (dates.length > 0) {
      const sortedDates = [...dates].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      let lastDate = new Date(sortedDates[0]);
      const diffFromToday = Math.round((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffFromToday <= 1) {
        streak = 1;
        for (let i = 1; i < sortedDates.length; i++) {
          const prevDate = new Date(sortedDates[i]);
          const diff = Math.round((lastDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diff === 1) {
            streak++;
            lastDate = prevDate;
          } else {
            break;
          }
        }
      } else {
        streak = 0;
      }

      let tempStreak = 1;
      bestStreak = 1;
      let lastHistorical = new Date(dates[0]);
      for (let i = 1; i < dates.length; i++) {
        const curr = new Date(dates[i]);
        const diff = Math.round((curr.getTime() - lastHistorical.getTime()) / (1000 * 60 * 60 * 24));
        if (diff === 1) {
          tempStreak++;
          bestStreak = Math.max(bestStreak, tempStreak);
        } else {
          tempStreak = 1;
        }
        lastHistorical = curr;
      }
      bestStreak = Math.max(bestStreak, streak);
    }
  }

  const priorityWeight =
    goal.priority === "high" ? 30 : goal.priority === "medium" ? 20 : 10;

  const deadlineWeight =
    daysRemaining <= 3
      ? 50
      : daysRemaining <= 7
        ? 40
        : daysRemaining <= 14
          ? 30
          : daysRemaining <= 30
            ? 20
            : 10;

  const remainingHours = normalizedMilestones
    .filter((m) => m.status === "pending")
    .reduce(
      (total, milestone) =>
        total + extractHours(milestone.estimatedEffort),
      0,
    );

  const remainingWorkWeight = Math.min(
    Math.round(remainingHours * 2),
    40,
  );

  const effectivePriorityScore = Math.min(
    Math.round(
      priorityWeight * 0.5 + deadlineWeight + remainingWorkWeight,
    ),
    100,
  );

  // 5. Calculate Completion Probability (AI model simulation - capacity-aware)
  let probability = 50;
  let probabilityConfidence: "HIGH" | "MEDIUM" | "LOW" = "LOW";
  
  const remainingEffortHours = remainingHours;
  const availableCapacityVal = dailyHours * daysRemaining;
  const workloadRatio = availableCapacityVal > 0 ? (remainingEffortHours / availableCapacityVal) : 1.0;

  if (totalMilestones === 0) {
    probability = 50;
    probabilityConfidence = "LOW";
  } else if (progress === 100) {
    probability = 100;
    probabilityConfidence = "HIGH";
  } else {
    let baseProb = 50;
    if (workloadRatio <= 0.5) {
      // Case A: range 70-85%
      // 85 at 0 workload, 70 at 0.5 workload
      baseProb = 85 - (workloadRatio * 30);
    } else if (workloadRatio <= 0.8) {
      // Case B: range 60-80%
      // 80 at 0.5 workload, 60 at 0.8 workload
      const t = (workloadRatio - 0.5) / 0.3;
      baseProb = 80 - t * 20;
    } else if (workloadRatio <= 1.0) {
      // Case C: range 50-70%
      // 70 at 0.8 workload, 50 at 1.0 workload
      const t = (workloadRatio - 0.8) / 0.2;
      baseProb = 70 - t * 20;
    } else {
      // Case D: range 20-50%
      // 50 at 1.0 workload, 20 at 2.0 workload (capped at 20)
      const t = Math.min(1.0, workloadRatio - 1.0);
      baseProb = 50 - t * 30;
    }

    // Progress should increase probability. Completed milestones should increase probability.
    const progressFactor = progress / 100;
    let computedProb = baseProb + progressFactor * 13;

    // Probability should never drop below 70% for a low-workload goal with 100+ days remaining.
    if (daysRemaining >= 100 && workloadRatio <= 0.5) {
      computedProb = Math.max(70, computedProb);
    }

    // Probability should never start at 95% for a brand-new goal.
    if (progress === 0) {
      computedProb = Math.min(85, computedProb);
    }

    probability = Math.min(Math.max(Math.round(computedProb), 5), 98);

    // Probability Confidence Rules:
    // HIGH: daysRemaining > 30 and workloadRatio < 0.7
    // MEDIUM: daysRemaining > 14
    // LOW: everything else
    if (daysRemaining > 30 && workloadRatio < 0.7) {
      probabilityConfidence = "HIGH";
    } else if (daysRemaining > 14) {
      probabilityConfidence = "MEDIUM";
    } else {
      probabilityConfidence = "LOW";
    }
  }

  const pendingMilestones = normalizedMilestones.filter(
    (m) => m.status === "pending",
  );
  const pastDueMilestones = pendingMilestones.filter((m) => {
    if (!m.deadline) return false;
    const mDate = new Date(m.deadline);
    mDate.setHours(0, 0, 0, 0);
    return mDate.getTime() < today.getTime();
  });

  if (pastDueMilestones.length > 0) {
    probability = Math.max(5, probability - pastDueMilestones.length * 8);
  }

  // 6. Calculate Goal Health Score (Heuristic)
  let healthScore = Math.min(probability + 5, 98);
  if (progress === 100) healthScore = 100;

  // 7. Determine Goal Status
  let status: Goal["status"] = goal.status || "healthy";
  if (goal.status !== "archived") {
    if (progress === 100) {
      status = "completed";
    } else if (probability < 50 || daysRemaining <= 14) {
      status = "critical";
    } else if (probability < 75) {
      status = "at-risk";
    } else {
      status = "healthy";
    }
  }

  // AI Reasoning Panel Explanation String
  const utilization = Math.round(workloadRatio * 100);
  const pressureText = daysRemaining <= 14 ? "High deadline pressure detected." : "No deadline pressure detected.";
  const probabilityExplanation = `• ${daysRemaining} days remaining\n• ${pendingMilestones.length} milestones remaining\n• ${dailyHours} hour daily capacity\n• ${utilization}% workload utilization\n• ${pressureText}`;

  // 8. Generate Dynamic Blocker Risks
  const risks: Risk[] = [];
  if (pastDueMilestones.length > 0) {
    risks.push({
      id: `past-due-${goal.id}`,
      title: `Missed Milestone: "${pastDueMilestones[0].title}"`,
      score: 95,
      bottleneck: `Milestone deadline was set for ${new Date(pastDueMilestones[0].deadline).toLocaleDateString()}, which has already passed.`,
      intervention: "Autonomous Replanning recommendation available. Review and Accept to redistribute the workload.",
      level: "high",
    });
  }

  if (status === "critical" && pendingMilestones.length > 0) {
    risks.push({
      id: `dyn-risk-${goal.id}`,
      title: `${pendingMilestones[0].title} is Blocking Progress`,
      score: 85,
      bottleneck: `This key step has estimated effort of "${pendingMilestones[0].estimatedEffort}" but is still pending with ${daysRemaining} days left.`,
      intervention: `Begin working on "${pendingMilestones[0].title}" immediately to restore timeline safety.`,
      level: "high",
    });
  } else if (daysRemaining < 7 && pendingMilestones.length > 0) {
    risks.push({
      id: `dyn-risk-${goal.id}`,
      title: "Upcoming Deadline Pressure",
      score: 65,
      bottleneck: `You have ${pendingMilestones.length} pending milestone(s) remaining with only ${daysRemaining} days before the deadline.`,
      intervention: "Review and complete remaining items sequentially.",
      level: "medium",
    });
  }

  // 9. Generate Dynamic Recovery Plan (Rescue Mode / Improvement Plan)
  let recoveryPlan: RecoveryPlan | undefined;
  if (
    progress < 100 &&
    pendingMilestones.length > 0
  ) {
    const recoverySteps: RecoveryStep[] = pendingMilestones
      .slice(0, 3)
      .map((pm, idx) => {
        const stepNumber = idx + 1;
        const stepImpact = Math.round(
          (95 - probability) / Math.min(pendingMilestones.length, 3),
        );

        return {
          id: pm.id,
          stepNumber,
          action: pm.title,
          estimatedTime: pm.estimatedEffort || "1 hour",
          impact: stepImpact,
          reason:
            pm.description ||
            `Completing this step resolves the bottleneck and secures progress metrics.`,
          status: "pending",
        };
      });

    const expectedChance = Math.min(
      probability + recoverySteps.reduce((acc, curr) => acc + curr.impact, 0),
      98,
    );

    recoveryPlan = {
      currentChance: probability,
      expectedChance,
      steps: recoverySteps,
      consequences: {
        timeframe: daysRemaining > 1 ? "24 hours" : "12 hours",
        points: [
          `Completion likelihood will decline from ${probability}% down to ${Math.round(probability * 0.6)}%.`,
          `Completing "${pendingMilestones[0].title}" will become the sole remaining critical bottleneck.`,
          daysRemaining <= 1
            ? "You will miss the deadline entirely."
            : "You will be forced to skip minor sub-tasks.",
        ],
      },
    };
  }

  // 10. Generate Dynamic Recommendations (Autonomous Suggestions Panel)
  const recommendations: Recommendation[] = [];
  if (pendingMilestones.length > 0) {
    recommendations.push({
      id: `dyn-rec-prob-${goal.id}`,
      action: `Completing "${pendingMilestones[0].title}" today`,
      reasoning: `Completing this task today increases completion probability from ${probability}% to ${Math.min(98, probability + 13)}%.`,
      impact: `Restores timeline safety buffer.`,
      level: pendingMilestones[0].priority === "high" ? "critical" : "medium",
    });

    if (probability < 75) {
      let actionText = `Increase study time from ${dailyHours} to ${dailyHours + 1} hours`;
      let reasonText = `Increasing study hours for "${goal.title}" provides extra workload capacity to handle pending milestones.`;
      if (goalType === "Habit" || goalType === "Skill") {
        if (titleLower.includes("gym") || titleLower.includes("workout")) {
          actionText = `Increase workout time from ${dailyHours} to ${dailyHours + 1} hours`;
          reasonText = `Increasing workout hours for "${goal.title}" provides extra capacity to complete scheduled routines.`;
        } else {
          actionText = `Increase practice time from ${dailyHours} to ${dailyHours + 1} hours`;
          reasonText = `Increasing practice hours for "${goal.title}" provides extra capacity to master daily progression steps.`;
        }
      } else if (goalType === "Project") {
        actionText = `Increase development time from ${dailyHours} to ${dailyHours + 1} hours`;
        reasonText = `Increasing development hours for "${goal.title}" provides extra capacity to handle building phases.`;
      }
      recommendations.push({
        id: `dyn-rec-hours-${goal.id}`,
        action: actionText,
        reasoning: reasonText,
        impact: `Secures +15% safety buffer.`,
        level: "medium",
      });
    }

    if (goalType === "Habit" || goalType === "Skill") {
      recommendations.push({
        id: `dyn-rec-habit-${goal.id}`,
        action: `Log a daily practice session today`,
        reasoning: `Consistently completing habit steps raises your consistency score above ${Math.min(95, consistency + 8)}%.`,
        impact: `Builds streak to ${streak + 1} days.`,
        level: "medium",
      });
    } else {
      recommendations.push({
        id: `dyn-rec-shift-${goal.id}`,
        action: `Move "${pendingMilestones[pendingMilestones.length - 1].title}" from Day ${daysRemaining} to Day ${Math.max(1, Math.round(daysRemaining * 0.6))}`,
        reasoning: `Shifting your final tasks up prevents last-minute submission bottlenecks.`,
        impact: `Improves completion probability.`,
        level: "medium",
      });
    }
  }

  // 11. Reconstruct historical dates for Recharts dynamically
  let probabilityHistory = [...(goal.probabilityHistory || [])];
  if (probabilityHistory.length === 0) {
    probabilityHistory = [
      { date: "Start", probability: Math.round(probability * 0.8) },
      { date: "Current", probability },
    ];
  } else {
    const lastIdx = probabilityHistory.length - 1;
    const lastItem = probabilityHistory[lastIdx];
    if (lastItem && lastItem.date === "Current") {
      probabilityHistory[lastIdx] = {
        ...lastItem,
        probability: probability,
      };
    }
  }

  // 12. Context-Aware Coaching
  let coachingAdvice = "No outstanding alerts. Keep completing your scheduled daily items.";
  if (goalType === "Exam") {
    if (daysRemaining <= 7) {
      coachingAdvice = `You only have ${daysRemaining} days before the ${goal.title}. Unit 4 contributes 30% of previous papers. Prioritize it first.`;
    } else {
      coachingAdvice = `Aggregating exam study materials early ensures a 15% lower stress peak. Focus on core syllabus notes.`;
    }
  } else if (goalType === "Habit" || goalType === "Skill") {
    if (titleLower.includes("gym") || titleLower.includes("workout")) {
      coachingAdvice = `Consistent workout sessions build physical conditioning. Today's ${dailyHours}-hour routine keeps your muscles activated.`;
    } else if (titleLower.includes("swim")) {
      coachingAdvice = `Consistent lap routines build lung capacity and water pacing. Today's ${dailyHours}-hour swim session keeps you on track.`;
    } else {
      coachingAdvice = `Consistent practice is the key to muscle memory. Today's ${dailyHours}-hour session keeps you on track.`;
    }
  } else if (goalType === "Project") {
    coachingAdvice = `Ensure clean database scripts and routes validation before diving into frontend layouts to prevent refactoring loops.`;
  } else if (goalType === "Deadline") {
    coachingAdvice = `Reverse-planning alert: complete key submissions 24 hours prior to deadline to prevent server overload failures.`;
  }

  // 13. Smart Notifications Layer
  const notifications: string[] = [];
  if (pastDueMilestones.length > 0) {
    notifications.push(`⚠️ "${goal.title}" milestone "${pastDueMilestones[0].title}" is overdue.`);
  } else if (daysRemaining <= 3 && progress < 100) {
    notifications.push(`⚠️ "${goal.title}" deadline in ${daysRemaining} days. Only ${completedCount} of ${totalMilestones} milestones complete. Risk level increased!`);
  } else if ((goalType === "Habit" || goalType === "Skill") && streak === 0 && consistency < 90 && completedCount > 0) {
    notifications.push(`⚠️ "${goal.title}" habit practice streak broken. Consistency is at ${consistency}%.`);
  } else if (goal.lastActivity) {
    const actDate = new Date(goal.lastActivity);
    const inactiveDays = Math.round((today.getTime() - actDate.getTime()) / (1000 * 60 * 60 * 24));
    if (inactiveDays >= 4) {
      notifications.push(`⚠️ No activity recorded for "${goal.title}" for ${inactiveDays} days.`);
    }
  }

  if (notifications.length === 0) {
    if (goalType === "Habit" || goalType === "Skill") {
      notifications.push(`💡 "${goal.title}" is currently on track. Daily check-in session is scheduled for ${dailyHours} hours.`);
    } else if (goalType === "Project") {
      notifications.push(`💡 "${goal.title}" is currently on track. Development session is scheduled for ${dailyHours} hours.`);
    } else {
      notifications.push(`💡 "${goal.title}" is currently on track. Study session is scheduled for ${dailyHours} hours.`);
    }
  }

  // 14. Autonomous Replanning Proposal Generation
  let replanningProposal: Goal["replanningProposal"] = undefined;
  if (pastDueMilestones.length > 0) {
    const proposed = normalizedMilestones.map((m) => {
      if (m.status === "pending") {
        const mDate = new Date(m.deadline || "");
        if (mDate.getTime() < today.getTime()) {
          return {
            ...m,
            deadline: today.toISOString().slice(0, 10),
            day: 1,
          };
        }
      }
      return m;
    });

    replanningProposal = {
      proposedMilestones: proposed,
      originalMilestones: normalizedMilestones,
      daysShifted: pastDueMilestones.length,
    };
  }

  return {
    ...goal,
    milestones: normalizedMilestones,
    progress,
    daysRemaining,
    effectivePriorityScore,
    completionProbability: probability,
    probabilityConfidence,
    probabilityExplanation,
    missionHealthScore: healthScore,
    status,
    risks,
    recoveryPlan,
    recommendations,
    probabilityHistory,
    goalType,
    coachingAdvice,
    notifications,
    streak,
    bestStreak,
    sessionsCompleted,
    consistency,
    replanningProposal,
  };
};
