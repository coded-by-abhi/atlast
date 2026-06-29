import React, { useState, useEffect } from "react";
import { Mic, MicOff, AlertCircle, CheckCircle2, Volume2, ToggleLeft, ToggleRight, History } from "lucide-react";
import type { Goal } from "../data/mockData";
import { askJarvisAgent } from "../services/geminiService";

interface TalkLog {
  sender: "user" | "jarvis";
  text: string;
  timestamp: string;
}

interface JarvisAssistantProps {
  onVoiceCommand: (command: string, parameter?: string) => void;
  goals: Goal[];
  missionCommand: any;
  productivityScore: number;
  selectedGoalId: string | null;
}

export const JarvisAssistant: React.FC<JarvisAssistantProps> = ({
  onVoiceCommand,
  goals,
  missionCommand,
  productivityScore,
  selectedGoalId,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [recognition, setRecognition] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [talkLogs, setTalkLogs] = useState<TalkLog[]>([]);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-US";

      rec.onstart = () => {
        setIsListening(true);
        setTranscript("");
        setStatusMessage("Listening for Jarvis command...");
        setErrorMessage("");
      };

      rec.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === "not-allowed") {
          const errMsg = "Microphone access is required for voice commands.";
          setErrorMessage(errMsg);
          speak(errMsg);
        } else {
          setErrorMessage(`Error: ${event.error}`);
        }
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onresult = (event: any) => {
        const text = event.results[0][0].transcript || "";
        setTranscript(text);
        
        // Save user input log
        setTalkLogs((prev) => [
          { sender: "user" as const, text, timestamp: new Date().toLocaleTimeString() },
          ...prev,
        ].slice(0, 10));

        parseVoiceCommand(text);
      };

      setRecognition(rec);
    } else {
      setErrorMessage("Speech Recognition not supported in this browser.");
    }
  }, [goals, missionCommand, productivityScore, selectedGoalId]);

  const toggleListening = () => {
    if (!recognition) return;
    if (isListening) {
      recognition.stop();
    } else {
      try {
        recognition.start();
      } catch (err) {
        console.error("Failed to start recognition:", err);
      }
    }
  };

  const speak = (text: string) => {
    if (!window.speechSynthesis) return;
    // Cancel current speech to prevent queues
    window.speechSynthesis.cancel();

    // Clean text for speech synth
    const cleanSpeechText = text.replace(/%/g, " percent");

    const utterance = new SpeechSynthesisUtterance(cleanSpeechText);
    utterance.rate = 0.92; // Slightly slower speech rate
    utterance.pitch = 1.0;

    // Add log entry for Jarvis response
    setTalkLogs((prev) => [
      { sender: "jarvis" as const, text, timestamp: new Date().toLocaleTimeString() },
      ...prev,
    ].slice(0, 10));

    window.speechSynthesis.speak(utterance);
  };

  const parseVoiceCommandLocalFallback = (text: string) => {
    const cleanText = text.toLowerCase().trim();
    const activeGoals = goals.filter((g) => g.status !== "archived");

    // 1. Create/Add/New Goal [Title]
    let matchTitle = "";
    if (cleanText.startsWith("create goal")) {
      matchTitle = text.substring(11).trim();
    } else if (cleanText.startsWith("add goal")) {
      matchTitle = text.substring(8).trim();
    } else if (cleanText.startsWith("new goal")) {
      matchTitle = text.substring(8).trim();
    } else if (cleanText.startsWith("add a goal named")) {
      matchTitle = text.substring(16).trim();
    } else if (cleanText.startsWith("create a goal named")) {
      matchTitle = text.substring(19).trim();
    } else if (cleanText.startsWith("new goal named")) {
      matchTitle = text.substring(14).trim();
    }

    if (matchTitle) {
      onVoiceCommand("create_goal", matchTitle);
      const reply = "Goal created. Please complete the remaining details.";
      setStatusMessage(reply);
      speak(reply);
      return;
    }

    // 2. Open Goal [Title]
    if (cleanText.startsWith("open goal") || cleanText.startsWith("open")) {
      const param = cleanText.startsWith("open goal")
        ? text.substring(9).trim()
        : text.substring(4).trim();
      
      if (param) {
        const match = goals.find((g) => g.title.toLowerCase().includes(param.toLowerCase()));
        if (match) {
          onVoiceCommand("open_goal", param);
          const reply = `Opening ${match.title}, sir.`;
          setStatusMessage(reply);
          speak(reply);
        } else {
          const reply = "I could not find that goal.";
          setStatusMessage(reply);
          speak(reply);
        }
      } else {
        const reply = "Please specify which goal to open.";
        setStatusMessage(reply);
        speak(reply);
      }
      return;
    }

    // 3. Mark Complete / Complete Milestone
    if (
      cleanText.includes("mark complete") ||
      cleanText.includes("complete milestone") ||
      cleanText.includes("mark milestone complete")
    ) {
      const activeGoal = goals.find((g) => g.id === selectedGoalId) || goals[0];
      if (activeGoal) {
        const firstPending = activeGoal.milestones.find((m) => m.status === "pending");
        if (firstPending) {
          onVoiceCommand("complete_milestone");
          const reply = `Milestone ${firstPending.title} marked as complete, sir.`;
          setStatusMessage(reply);
          speak(reply);
        } else {
          const reply = "No pending milestones found for this goal.";
          setStatusMessage(reply);
          speak(reply);
        }
      } else {
        const reply = "No active goal selected to complete milestones.";
        setStatusMessage(reply);
        speak(reply);
      }
      return;
    }

    // 4. Archive Goal [Title]
    if (cleanText.startsWith("archive")) {
      const param = cleanText.startsWith("archive goal")
        ? text.substring(12).trim()
        : text.substring(7).trim();
      
      const activeGoal = param
        ? goals.find((g) => g.title.toLowerCase().includes(param.toLowerCase()))
        : (goals.find((g) => g.id === selectedGoalId) || goals[0]);

      if (activeGoal) {
        onVoiceCommand("archive_goal", activeGoal.title);
        const reply = `Archiving goal ${activeGoal.title}, sir.`;
        setStatusMessage(reply);
        speak(reply);
      } else {
        const reply = "No matching goal found to archive.";
        setStatusMessage(reply);
        speak(reply);
      }
      return;
    }

    // 5. Delete Goal [Title]
    if (cleanText.startsWith("delete") || cleanText.startsWith("remove")) {
      const param = cleanText.startsWith("delete goal")
        ? text.substring(11).trim()
        : cleanText.startsWith("remove goal")
        ? text.substring(11).trim()
        : cleanText.startsWith("delete")
        ? text.substring(6).trim()
        : text.substring(6).trim();

      const activeGoal = param
        ? goals.find((g) => g.title.toLowerCase().includes(param.toLowerCase()))
        : (goals.find((g) => g.id === selectedGoalId) || goals[0]);

      if (activeGoal) {
        onVoiceCommand("delete_goal", activeGoal.title);
        const reply = `Deleting goal ${activeGoal.title}, sir.`;
        setStatusMessage(reply);
        speak(reply);
      } else {
        const reply = "No matching goal found to delete.";
        setStatusMessage(reply);
        speak(reply);
      }
      return;
    }

    // 6. Go To Dashboard
    if (
      cleanText.includes("go to dashboard") ||
      cleanText.includes("open dashboard") ||
      cleanText.includes("show dashboard")
    ) {
      onVoiceCommand("go_to_dashboard");
      const reply = "Returning to dashboard.";
      setStatusMessage(reply);
      speak(reply);
      return;
    }

    // 7. What should I do today?
    if (
      cleanText.includes("what should i do today") ||
      cleanText.includes("what is my task today") ||
      cleanText.includes("today focus")
    ) {
      const focusText = missionCommand?.todayFocus;
      const criticalGoal = activeGoals.find((g) => g.status === "critical");
      const expectedGain = criticalGoal
        ? criticalGoal.milestones.find((m) => m.status === "pending")?.priority === "high"
          ? "18 percent"
          : "12 percent"
        : "6 percent";

      if (focusText) {
        const cleanedFocus = focusText.replace(/g-\d+/g, (id: string) => {
          const matchGoal = goals.find(g => g.id === id);
          return matchGoal ? matchGoal.title : id;
        });
        const reply = `Your highest priority task today is: ${cleanedFocus}. Completing it increases your success probability by ${expectedGain}.`;
        setStatusMessage(reply);
        speak(reply);
      } else if (criticalGoal) {
        const pendingMilestone = criticalGoal.milestones.find((m) => m.status === "pending");
        const reply = `Your highest priority task today is ${criticalGoal.title} milestone: ${pendingMilestone?.title || "next step"}. Completing it raises success probability by ${expectedGain}.`;
        setStatusMessage(reply);
        speak(reply);
      } else {
        const reply = "All goal timelines are currently secured. No urgent target tasks today, sir.";
        setStatusMessage(reply);
        speak(reply);
      }
      return;
    }

    // 8. Which goal is most urgent?
    if (cleanText.includes("which goal is most urgent") || cleanText.includes("urgent goal")) {
      const sorted = [...activeGoals].sort((a, b) => a.daysRemaining - b.daysRemaining);
      if (sorted.length > 0) {
        const reply = `${sorted[0].title} is currently your most urgent goal. ${sorted[0].daysRemaining} days remain until the deadline.`;
        setStatusMessage(reply);
        speak(reply);
      } else {
        const reply = "You have no active goals in progress.";
        setStatusMessage(reply);
        speak(reply);
      }
      return;
    }

    // 9. Show recovery plan
    if (cleanText.includes("show recovery plan") || cleanText.includes("recovery plan")) {
      const criticalGoal = activeGoals.find((g) => g.status === "critical" && g.recoveryPlan);
      if (criticalGoal && criticalGoal.recoveryPlan) {
        const reply = `Displaying recovery protocol. Completing the next three steps raises success probability from ${criticalGoal.recoveryPlan.currentChance} percent to ${criticalGoal.recoveryPlan.expectedChance} percent.`;
        setStatusMessage(reply);
        speak(reply);
      } else {
        const reply = "All goals are currently running healthy. No active recovery plans needed, sir.";
        setStatusMessage(reply);
        speak(reply);
      }
      return;
    }

    // 10. How am I doing?
    if (
      cleanText.includes("how am i doing") ||
      cleanText.includes("how is my progress") ||
      cleanText.includes("productivity score")
    ) {
      const atRiskCount = activeGoals.filter((g) => g.status === "critical" || g.status === "at-risk").length;
      const reply = `Your productivity score is ${productivityScore}. You have ${activeGoals.length} active goals and ${atRiskCount} goal currently at risk.`;
      setStatusMessage(reply);
      speak(reply);
      return;
    }

    // 11. Why am I behind?
    if (cleanText.includes("why am i behind") || cleanText.includes("reasons for delay")) {
      const behindGoals = activeGoals.filter(g => g.status === 'critical' || g.status === 'at-risk');
      if (behindGoals.length > 0) {
        const first = behindGoals[0];
        const pendingCount = first.milestones.filter(m => m.status === 'pending').length;
        const reply = `You are behind because ${first.title} has ${pendingCount} pending milestone(s) remaining with only ${first.daysRemaining} days left. Success probability is down to ${first.completionProbability} percent.`;
        setStatusMessage(reply);
        speak(reply);
      } else {
        const reply = "All goals are currently running healthy, sir. No behind indicators detected.";
        setStatusMessage(reply);
        speak(reply);
      }
      return;
    }

    // 12. What is my biggest risk?
    if (cleanText.includes("what is my biggest risk") || cleanText.includes("biggest risk") || cleanText.includes("major bottleneck")) {
      const activeRisks = activeGoals.flatMap(g => (g.risks || []).map(r => ({ ...r, goalTitle: g.title })));
      if (activeRisks.length > 0) {
        const sortedRisks = activeRisks.sort((a, b) => b.score - a.score);
        const reply = `Your biggest risk is: ${sortedRisks[0].title} for goal ${sortedRisks[0].goalTitle}. The bottleneck is: ${sortedRisks[0].bottleneck}`;
        setStatusMessage(reply);
        speak(reply);
      } else {
        const reply = "All goal timelines are fully secured, sir. There are no active bottleneck risks.";
        setStatusMessage(reply);
        speak(reply);
      }
      return;
    }

    // Unrecognized command
    const errMsg = 'I did not understand that command. Try saying: "What should I do today?"';
    setStatusMessage(errMsg);
    speak(errMsg);
  };

  const parseVoiceCommand = async (text: string) => {
    const cleanText = text.toLowerCase().trim();
    console.log("Jarvis heard:", cleanText);

    // Fast local checks first to bypass network latency on dashboard route
    if (
      cleanText.includes("go to dashboard") ||
      cleanText.includes("open dashboard") ||
      cleanText.includes("show dashboard")
    ) {
      onVoiceCommand("go_to_dashboard");
      const reply = "Returning to dashboard, sir.";
      setStatusMessage(reply);
      speak(reply);
      return;
    }

    setStatusMessage("Thinking...");
    try {
      const result = await askJarvisAgent(text, goals, selectedGoalId);
      if (result.speech) {
        setStatusMessage(result.speech);
        speak(result.speech);
      }
      if (result.command) {
        onVoiceCommand(result.command, result.parameter);
      }
    } catch (e) {
      console.log("Ask Jarvis API failed, running local command matchers.");
      parseVoiceCommandLocalFallback(text);
    }
  };

  return (
    <div className="flex flex-col gap-2 shrink-0 select-none relative z-50">
      <div className="flex items-center gap-3 bg-zinc-900/60 border border-zinc-800 rounded-xl px-3 py-1.5">
        {/* Toggle Demo Mode */}
        <button
          onClick={() => setIsDemoMode(!isDemoMode)}
          className={`flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-bold font-mono transition-all duration-150 uppercase border ${
            isDemoMode
              ? "bg-purple-950/40 text-purple-400 border-purple-800/40"
              : "bg-zinc-950 text-zinc-550 border-zinc-850 hover:border-zinc-800"
          }`}
          title="Toggle Jarvis Demo Mode"
        >
          {isDemoMode ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
          <span>Demo Mode</span>
        </button>

        <button
          onClick={toggleListening}
          className={`p-2 rounded-lg border transition-all flex items-center justify-center relative overflow-hidden group ${
            isListening
              ? "bg-rose-500/10 border-rose-500/30 text-rose-400 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.15)]"
              : "bg-zinc-950 border-zinc-800 hover:border-purple-500/30 hover:text-purple-400 text-zinc-400"
          }`}
          title={isListening ? "Stop listening" : "Start Voice Assistant (Jarvis Mode)"}
        >
          {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
        </button>

        <div className="flex flex-col">
          <span className="text-[9px] font-bold tracking-widest text-purple-400 uppercase font-mono flex items-center gap-1">
            <Volume2 className="w-2.5 h-2.5" />
            Jarvis AI
          </span>
          <span className="text-[10px] text-zinc-400 max-w-[200px] truncate font-medium">
            {errorMessage ? (
              <span className="text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                Speech API error
              </span>
            ) : isListening ? (
              <span className="text-rose-400">Listening...</span>
            ) : transcript ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 shrink-0" />
                "{transcript}"
              </span>
            ) : (
              "Click mic to speak"
            )}
          </span>
        </div>
      </div>

      {/* Floating status card when speaking */}
      {isListening && (
        <div className="fixed bottom-6 right-6 glass-panel border-rose-500/25 bg-rose-950/10 rounded-xl p-4 shadow-xl shadow-rose-950/10 flex items-center gap-3 z-50 animate-bounce duration-1000 max-w-sm">
          <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400 border border-rose-500/20 shrink-0">
            <Mic className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-rose-400 font-mono uppercase tracking-wider">
              Jarvis listening...
            </h4>
            <p className="text-[11px] text-zinc-300 leading-normal mt-0.5">
              {statusMessage || 'Try saying: "What should I do today?" or "Open OS Exam"'}
            </p>
          </div>
        </div>
      )}

      {/* Demo Conversations Board Panel (displays last 5 talkLogs) */}
      {isDemoMode && (
        <div className="absolute right-0 top-12 w-80 glass-panel border border-purple-500/20 bg-zinc-950/90 rounded-2xl p-4 shadow-xl space-y-3 z-50 fade-in select-text">
          <h4 className="text-[10px] font-bold text-purple-400 uppercase tracking-widest font-mono flex items-center gap-1 border-b border-zinc-900 pb-2">
            <History className="w-3.5 h-3.5" />
            Live Demo Logs (Last 5)
          </h4>
          <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
            {talkLogs.length === 0 ? (
              <p className="text-[10px] text-zinc-600 font-mono italic text-center py-4">
                No conversation history yet. Start speaking!
              </p>
            ) : (
              talkLogs.slice(0, 5).map((log, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded-lg border text-[10px] leading-relaxed font-mono ${
                    log.sender === "user"
                      ? "bg-zinc-900/60 border-zinc-800 text-zinc-300 self-end"
                      : "bg-purple-950/10 border-purple-900/20 text-purple-300"
                  }`}
                >
                  <div className="flex items-center justify-between text-[8px] text-zinc-555 font-bold mb-0.5">
                    <span>{log.sender === "user" ? "USER" : "JARVIS RESPONSE"}</span>
                    <span>{log.timestamp}</span>
                  </div>
                  <p>{log.text}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
