import {
  generateGoalPlan,
  generateMissionCommand,
} from "./services/geminiService";
import { useState, useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./pages/Dashboard";
import { CreateGoal } from "./pages/CreateGoal";
import { GoalIntelligence } from "./pages/GoalIntelligence";
import { initialGoals, calculateGoalStats } from "./data/mockData";
import type { Goal, Milestone } from "./data/mockData";
import { JarvisAssistant } from "./components/JarvisAssistant";

function App() {
  const [goals, setGoals] = useState<Goal[]>(() => {
    const saved = localStorage.getItem("atlast_goals");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Recalculate stats on load to ensure accuracy relative to "today" date
        return parsed.map((g: Goal) => calculateGoalStats(g));
      } catch (e) {
        console.error("Failed to parse saved Atlast goals:", e);
      }
    }
    return initialGoals;
  });

  const [currentPage, setCurrentPage] = useState<string>("dashboard");
  const [selectedGoalId, setSelectedGoalId] = useState<string>("");
  const [jarvisPrefilledTitle, setJarvisPrefilledTitle] = useState("");
  const [missionCommand, setMissionCommand] = useState<any>(() => {
    const saved = localStorage.getItem("atlast_mission_command");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse cached mission command:", e);
      }
    }
    return null;
  });

  // 2. Persist state changes
  useEffect(() => {
    localStorage.setItem("atlast_goals", JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    if (missionCommand) {
      localStorage.setItem("atlast_mission_command", JSON.stringify(missionCommand));
    }
  }, [missionCommand]);

  // Debounced Mission Commander AI Updates (non-blocking, fallback-safe)
  useEffect(() => {
    if (goals.length === 0) return;

    const timer = setTimeout(() => {
      generateMissionCommand(goals)
        .then((result) => {
          setMissionCommand(result);
        })
        .catch(console.error);
    }, 1000);

    return () => clearTimeout(timer);
  }, [goals]);

  // Set initial selected goal on load if goals exist
  useEffect(() => {
    if (goals.length > 0 && !selectedGoalId) {
      const activeGoal = goals.find((g) => g.status !== "archived");
      if (activeGoal) setSelectedGoalId(activeGoal.id);
    }
  }, [goals, selectedGoalId]);

  // Navigation helpers
  const handleSelectGoal = (goalId: string) => {
    setSelectedGoalId(goalId);
    setCurrentPage("intelligence");
  };

  // --- GOAL CRUD ACTIONS ---

  const handleAddGoal = async (goalData: {
    title: string;
    description: string;
    deadline: string;
    priority: "low" | "medium" | "high";
    category: string;
    hoursPerDay: number;
  }) => {
    try {
      console.log("Testing Gemini...");

      const result = await generateGoalPlan(goalData);

      console.log("AI PLAN:", result);

      const newGoalBase = {
        id: `g-${Date.now()}`,
        title: goalData.title,
        description: goalData.description,
        deadline: goalData.deadline,
        priority: goalData.priority,
        category: goalData.category,

        availableHoursPerDay: goalData.hoursPerDay,

        milestones: (result.milestones || []).map((m: any, index: number) => {
          const mDay = m.day || (index + 1);
          const schedDate = new Date();
          schedDate.setHours(0,0,0,0);
          schedDate.setDate(schedDate.getDate() + (mDay - 1));

          return {
            id: `m-${Date.now()}-${index}`,
            title: m.title,
            description: m.description,
            estimatedEffort: m.estimatedEffort || "1 hour",
            priority: m.priority || "medium",
            deadline: goalData.deadline,
            status: "pending" as const,
            day: mDay,
            successCriteria: m.successCriteria,
            plannedScheduleDate: schedDate.toISOString().slice(0, 10),
          };
        }),

        risks: result.bottlenecks || [],

        recommendations: (result.recovery_plan || []).map(
          (item: string, index: number) => ({
            id: `rec-${Date.now()}-${index}`,
            action: item,
            reasoning: "AI generated recovery recommendation",
            impact: "Improves goal completion likelihood",
            level: "medium" as const,
          }),
        ),
        timeline: [
          {
            id: `t-init-${Date.now()}`,
            timestamp: new Date().toISOString(),
            message: "Goal created using AI plan.",
            type: "success" as const,
          },
        ],

        criticalPath: [],
        probabilityHistory: [],
      };

      const calculatedGoal = calculateGoalStats(newGoalBase);

      setGoals((prev) => [calculatedGoal, ...prev]);

      setSelectedGoalId(calculatedGoal.id);
      setJarvisPrefilledTitle("");

      setCurrentPage("dashboard");
    } catch (error) {
      console.error("Failed to create AI goal:", error);
      alert("Failed to generate AI plan. Check console for details.");
    }
  };
  const handleUpdateGoal = (goalId: string, goalData: Partial<Goal>) => {
    setGoals((prevGoals) =>
      prevGoals.map((g) => {
        if (g.id !== goalId) return g;

        const updated = {
          ...g,
          ...goalData,
          timeline: [
            {
              id: `t-upd-${Date.now()}`,
              timestamp: new Date().toISOString(),
              message: "Goal details updated.",
              type: "update" as const,
            },
            ...g.timeline,
          ],
        };
        return calculateGoalStats(updated);
      }),
    );
  };

  const handleDeleteGoal = (goalId: string) => {
    setGoals((prevGoals) => {
      const filtered = prevGoals.filter((g) => g.id !== goalId);
      if (selectedGoalId === goalId) {
        const nextActive = filtered.find((g) => g.status !== "archived");
        setSelectedGoalId(nextActive ? nextActive.id : "");
      }
      return filtered;
    });
    setCurrentPage("dashboard");
  };

  const handleArchiveGoal = (goalId: string) => {
    setGoals((prevGoals) =>
      prevGoals.map((g) => {
        if (g.id !== goalId) return g;
        const updated = {
          ...g,
          status: "archived" as const,
          timeline: [
            {
              id: `t-arch-${Date.now()}`,
              timestamp: new Date().toISOString(),
              message: "Goal moved to archive.",
              type: "update" as const,
            },
            ...g.timeline,
          ],
        };
        return calculateGoalStats(updated);
      }),
    );
  };

  const handleReopenGoal = (goalId: string) => {
    setGoals((prevGoals) =>
      prevGoals.map((g) => {
        if (g.id !== goalId) return g;
        // Reopen resets archived status; calculateGoalStats will assign healthy/at-risk/critical
        const { status: _, ...rest } = g;
        const updated = {
          ...rest,
          timeline: [
            {
              id: `t-reopen-${Date.now()}`,
              timestamp: new Date().toISOString(),
              message: "Goal reopened.",
              type: "success" as const,
            },
            ...g.timeline,
          ],
        };
        return calculateGoalStats(updated);
      }),
    );
  };

  // --- MILESTONE CRUD ACTIONS ---

  const handleAddMilestone = (
    goalId: string,
    milestoneData: Omit<Milestone, "id" | "status">,
  ) => {
    setGoals((prevGoals) =>
      prevGoals.map((g) => {
        if (g.id !== goalId) return g;

        const newMilestone: Milestone = {
          id: `m-${Date.now()}`,
          status: "pending",
          ...milestoneData,
        };

        const updated = {
          ...g,
          milestones: [...g.milestones, newMilestone],
          timeline: [
            {
              id: `t-ms-add-${Date.now()}`,
              timestamp: new Date().toISOString(),
              message: `Milestone added: "${milestoneData.title}".`,
              type: "update" as const,
            },
            ...g.timeline,
          ],
        };

        return calculateGoalStats(updated);
      }),
    );
  };

  const handleUpdateMilestone = (
    goalId: string,
    milestoneId: string,
    milestoneData: Partial<Milestone>,
  ) => {
    setGoals((prevGoals) =>
      prevGoals.map((g) => {
        if (g.id !== goalId) return g;

        const updatedMilestones = g.milestones.map((m) => {
          if (m.id !== milestoneId) return m;
          return { ...m, ...milestoneData };
        });

        const updated = {
          ...g,
          milestones: updatedMilestones,
          timeline: [
            {
              id: `t-ms-upd-${Date.now()}`,
              timestamp: new Date().toISOString(),
              message: `Milestone updated: "${milestoneData.title || "Details"}".`,
              type: "update" as const,
            },
            ...g.timeline,
          ],
        };

        return calculateGoalStats(updated);
      }),
    );
  };

  const handleDeleteMilestone = (goalId: string, milestoneId: string) => {
    setGoals((prevGoals) =>
      prevGoals.map((g) => {
        if (g.id !== goalId) return g;

        const deletedMs = g.milestones.find((m) => m.id === milestoneId);
        const filteredMilestones = g.milestones.filter(
          (m) => m.id !== milestoneId,
        );

        const updated = {
          ...g,
          milestones: filteredMilestones,
          timeline: [
            {
              id: `t-ms-del-${Date.now()}`,
              timestamp: new Date().toISOString(),
              message: `Milestone deleted: "${deletedMs?.title || "Milestone Node"}".`,
              type: "alert" as const,
            },
            ...g.timeline,
          ],
        };

        return calculateGoalStats(updated);
      }),
    );
  };

  const handleCompleteMilestone = (goalId: string, milestoneId: string) => {
    setGoals((prevGoals) =>
      prevGoals.map((g) => {
        if (g.id !== goalId) return g;

        const updatedMilestones = g.milestones.map((m) => {
          if (m.id !== milestoneId) return m;
          return {
            ...m,
            status: "completed" as const,
            completedAt: new Date().toISOString().slice(0, 10),
          };
        });

        const completedMs = g.milestones.find((m) => m.id === milestoneId);

        const updated = {
          ...g,
          milestones: updatedMilestones,
          timeline: [
            {
              id: `t-ms-comp-${Date.now()}`,
              timestamp: new Date().toISOString(),
              message: `Completed milestone: "${completedMs?.title || "Milestone Node"}".`,
              type: "milestone" as const,
            },
            ...g.timeline,
          ],
        };

        return calculateGoalStats(updated);
      }),
    );
  };

  const handleRevertMilestone = (goalId: string, milestoneId: string) => {
    setGoals((prevGoals) =>
      prevGoals.map((g) => {
        if (g.id !== goalId) return g;

        const updatedMilestones = g.milestones.map((m) => {
          if (m.id !== milestoneId) return m;
          const { completedAt: _, ...rest } = m;
          return {
            ...rest,
            status: "pending" as const,
          };
        });

        const revertedMs = g.milestones.find((m) => m.id === milestoneId);

        const updated = {
          ...g,
          milestones: updatedMilestones,
          timeline: [
            {
              id: `t-ms-rev-${Date.now()}`,
              timestamp: new Date().toISOString(),
              message: `Reopened milestone: "${revertedMs?.title || "Milestone Node"}".`,
              type: "update" as const,
            },
            ...g.timeline,
          ],
        };

        return calculateGoalStats(updated);
      }),
    );
  };

  const handleReorderMilestones = (
    goalId: string,
    startIndex: number,
    endIndex: number,
  ) => {
    setGoals((prevGoals) =>
      prevGoals.map((g) => {
        if (g.id !== goalId) return g;

        const result = Array.from(g.milestones);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);

        return calculateGoalStats({
          ...g,
          milestones: result,
        });
      }),
    );
  };

  const handleCompleteRecoveryStep = (goalId: string, stepId: string) => {
    // A recovery step maps directly to the milestone ID
    handleCompleteMilestone(goalId, stepId);
  };

  const handleAcceptReplanning = (goalId: string) => {
    setGoals((prevGoals) =>
      prevGoals.map((g) => {
        if (g.id !== goalId) return g;
        if (!g.replanningProposal) return g;

        const timestamp = new Date().toLocaleString();
        const newHistory = [
          `Rescheduled ${g.replanningProposal.daysShifted} missed milestone(s) to today. Workload redistributed. [${timestamp}]`,
          ...(g.replannedHistory || [])
        ];

        const updated = {
          ...g,
          milestones: g.replanningProposal.proposedMilestones,
          replanningProposal: undefined,
          replannedHistory: newHistory,
          lastActivity: new Date().toISOString()
        };

        return calculateGoalStats(updated);
      })
    );
  };

  const handleVoiceCommand = async (command: string, parameter?: string) => {
    console.log("Jarvis execute command:", command, "with:", parameter);
    
    if (command === "go_to_dashboard") {
      setCurrentPage("dashboard");
      return;
    }

    if (command === "create_goal" && parameter) {
      setJarvisPrefilledTitle(parameter);
      setCurrentPage("create");
      return;
    }

    if (command === "open_goal" && parameter) {
      const match = goals.find(g => g.title.toLowerCase().includes(parameter.toLowerCase()));
      if (match) {
        setSelectedGoalId(match.id);
        setCurrentPage("intelligence");
      }
      return;
    }

    if (command === "complete_milestone") {
      const activeGoal = goals.find(g => g.id === selectedGoalId) || goals[0];
      if (activeGoal) {
        const firstPending = activeGoal.milestones.find(m => m.status === "pending");
        if (firstPending) {
          handleCompleteMilestone(activeGoal.id, firstPending.id);
        }
      }
      return;
    }

    if (command === "archive_goal") {
      const activeGoal = (parameter && parameter !== "current")
        ? goals.find(g => g.title.toLowerCase().includes(parameter.toLowerCase()))
        : (goals.find(g => g.id === selectedGoalId) || goals[0]);
      if (activeGoal) {
        handleArchiveGoal(activeGoal.id);
      }
      return;
    }

    if (command === "delete_goal") {
      const activeGoal = (parameter && parameter !== "current")
        ? goals.find(g => g.title.toLowerCase().includes(parameter.toLowerCase()))
        : (goals.find(g => g.id === selectedGoalId) || goals[0]);
      if (activeGoal) {
        handleDeleteGoal(activeGoal.id);
      }
      return;
    }
  };

  // Productivity Score Calculator inside App.tsx to feed Jarvis voice responses
  const completedMilestonesCount = goals.reduce((acc, curr) => acc + curr.milestones.filter(m => m.status === 'completed').length, 0);
  const totalMilestonesCount = goals.reduce((acc, curr) => acc + curr.milestones.length, 0);
  const activeStreaksSum = goals.reduce((acc, curr) => acc + (curr.streak || 0), 0);
  const rescuedGoalsCount = goals.filter(g => g.status !== 'critical' && g.probabilityHistory && g.probabilityHistory.length > 1 && g.completionProbability > (g.probabilityHistory[0]?.probability || 50)).length;
  const overdueTasksCount = goals.reduce((acc, curr) => acc + curr.milestones.filter(m => {
    if (m.status !== 'pending' || !m.deadline) return false;
    return new Date(m.deadline).getTime() < new Date().setHours(0,0,0,0);
  }).length, 0);

  let productivityScore = 75;
  if (totalMilestonesCount > 0) {
    const streakBonus = Math.min(activeStreaksSum * 5, 20);
    const completionPart = Math.round((completedMilestonesCount / totalMilestonesCount) * 40);
    const rescueBonus = Math.min(rescuedGoalsCount * 10, 25);
    const overduePenalty = Math.min(overdueTasksCount * 8, 25);
    
    productivityScore = Math.max(0, Math.min(100, 40 + streakBonus + completionPart + rescueBonus - overduePenalty));
  }

  return (
    <div className="flex bg-zinc-950 text-zinc-100 min-h-screen font-sans antialiased overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        goals={goals}
      />

      {/* Main Panel Viewport */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden bg-zinc-950">
        {/* Top Header Jarvis assistant bar */}
        <div className="flex items-center justify-between border-b border-zinc-900 bg-zinc-950 px-6 py-3 select-none">
          <span className="text-xs font-black tracking-widest text-zinc-500 font-mono">
            ATLAST AI COMPANION
          </span>
          <JarvisAssistant 
            onVoiceCommand={handleVoiceCommand} 
            goals={goals}
            missionCommand={missionCommand}
            productivityScore={productivityScore}
            selectedGoalId={selectedGoalId}
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {currentPage === "dashboard" && (
            <Dashboard
              goals={goals}
              missionCommand={missionCommand}
              onSelectGoal={handleSelectGoal}
              onNavigateToCreate={() => setCurrentPage("create")}
              onCompleteRecoveryStep={handleCompleteRecoveryStep}
            />
          )}

          {currentPage === "create" && <CreateGoal onAddGoal={handleAddGoal} prefilledTitle={jarvisPrefilledTitle} />}

          {currentPage === "intelligence" && (
            <GoalIntelligence
              goals={goals}
              selectedGoalId={selectedGoalId}
              onSelectGoal={setSelectedGoalId}
              onCompleteRecoveryStep={handleCompleteRecoveryStep}
              onUpdateGoal={handleUpdateGoal}
              onDeleteGoal={handleDeleteGoal}
              onArchiveGoal={handleArchiveGoal}
              onReopenGoal={handleReopenGoal}
              onAddMilestone={handleAddMilestone}
              onUpdateMilestone={handleUpdateMilestone}
              onDeleteMilestone={handleDeleteMilestone}
              onCompleteMilestone={handleCompleteMilestone}
              onRevertMilestone={handleRevertMilestone}
              onReorderMilestones={handleReorderMilestones}
              onAcceptReplanning={handleAcceptReplanning}
            />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
