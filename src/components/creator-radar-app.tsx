"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import {
  Activity,
  BadgeCheck,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Compass,
  Flame,
  Hourglass,
  Layers,
  Loader2,
  Sparkles,
  Target,
  TrendingUp,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { StageA, StageB, StageC, StageD, StageE } from "@/lib/schemas";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

type StageKey = "A" | "B" | "C" | "D" | "E";
type StageStatus = "idle" | "running" | "done" | "error";

type StreamEvent = {
  type: "stage_start" | "stage_complete" | "log" | "result" | "error";
  stage?: string;
  message?: string;
  payload?: unknown;
};

const STAGES: {
  key: StageKey;
  name: string;
  icon: typeof Sparkles;
  description: string;
}[] = [
  {
    key: "A",
    name: "Segmentation",
    icon: Layers,
    description: "Detect structure and segment roles.",
  },
  {
    key: "B",
    name: "Engagement",
    icon: Activity,
    description: "Identify drop-off and engagement risks.",
  },
  {
    key: "C",
    name: "Audience Fit",
    icon: Target,
    description: "Check tone, clarity, and audience match.",
  },
  {
    key: "D",
    name: "Trends",
    icon: TrendingUp,
    description: "Compare against live trends.",
  },
  {
    key: "E",
    name: "Synthesis",
    icon: Wand2,
    description: "Finalize priorities and rewrite plan.",
  },
];

const stageLookup = new Map(STAGES.map((stage) => [stage.name, stage.key]));

const onboardingSteps = [
  {
    title: "Paste your content",
    detail: "Scripts, posts, newsletters, or threads.",
    icon: BookOpen,
  },
  {
    title: "Run the multi-stage analysis",
    detail: "Five layers of structural and trend diagnostics.",
    icon: Compass,
  },
  {
    title: "Export the rewrite blueprint",
    detail: "Get a PDF you can share instantly.",
    icon: BadgeCheck,
  },
];

export default function CreatorRadarApp() {
  const [content, setContent] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [currentStage, setCurrentStage] = useState<string | null>(null);
  const [stageStatus, setStageStatus] = useState<Record<string, StageStatus>>(
    () =>
      STAGES.reduce((acc, stage) => {
        acc[stage.name] = "idle";
        return acc;
      }, {} as Record<string, StageStatus>)
  );
  const [logs, setLogs] = useState<string[]>([]);
  const [timeline, setTimeline] = useState<
    { id: string; type: string; stage?: string; message?: string }[]
  >([]);
  const [toastQueue, setToastQueue] = useState<
    { id: string; title: string }[]
  >([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorStage, setErrorStage] = useState<StageKey | null>(null);

  const [stageA, setStageA] = useState<StageA | null>(null);
  const [stageB, setStageB] = useState<StageB | null>(null);
  const [stageC, setStageC] = useState<StageC | null>(null);
  const [stageD, setStageD] = useState<StageD | null>(null);
  const [stageE, setStageE] = useState<StageE | null>(null);

  const [activeSegmentId, setActiveSegmentId] = useState<number | null>(null);
  const [highlightSegmentId, setHighlightSegmentId] = useState<number | null>(
    null
  );
  const [hasOnboarded, setHasOnboarded] = useState(true);

  const timelineEndRef = useRef<HTMLDivElement | null>(null);
  const logsEndRef = useRef<HTMLDivElement | null>(null);
  const reportRef = useRef<HTMLDivElement | null>(null);
  const finalRef = useRef<HTMLDivElement | null>(null);
  const segmentRefs = useRef(new Map<number, HTMLDivElement>());

  const { scrollYProgress } = useScroll();
  const heroOffset = useTransform(scrollYProgress, [0, 0.4], [0, -80]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const visited = window.localStorage.getItem("ccr_onboarded");
    setHasOnboarded(visited === "true");
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  useEffect(() => {
    timelineEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [timeline]);

  const wordCount = useMemo(() => {
    if (!content) return 0;
    return content.trim().split(/\s+/).filter(Boolean).length;
  }, [content]);
  const charCount = content.length;

  const statusProgress = useMemo(() => {
    const completed = STAGES.filter(
      (stage) => stageStatus[stage.name] === "done"
    ).length;
    return Math.round((completed / STAGES.length) * 100);
  }, [stageStatus]);

  const segmentIssues = useMemo(() => {
    if (!activeSegmentId) return null;
    const dropOff =
      stageB?.dropOffRisks.filter((risk) => risk.segmentId === activeSegmentId) ??
      [];
    const engagement =
      stageB?.engagementIssues.filter(
        (issue) => issue.segmentId === activeSegmentId
      ) ?? [];
    const clarity =
      stageC?.clarityIssues.filter(
        (issue) => issue.segmentId === activeSegmentId
      ) ?? [];
    return { dropOff, engagement, clarity };
  }, [activeSegmentId, stageB, stageC]);

  const resetState = () => {
    setStageA(null);
    setStageB(null);
    setStageC(null);
    setStageD(null);
    setStageE(null);
    setLogs([]);
    setTimeline([]);
    setCurrentStage(null);
    setErrorMessage(null);
    setErrorStage(null);
    setActiveSegmentId(null);
    setHighlightSegmentId(null);
    setStageStatus(
      STAGES.reduce((acc, stage) => {
        acc[stage.name] = "idle";
        return acc;
      }, {} as Record<string, StageStatus>)
    );
  };

  const queueToast = (title: string) => {
    const id = crypto.randomUUID();
    setToastQueue((prev) => [...prev, { id, title }]);
    setTimeout(() => {
      setToastQueue((prev) => prev.filter((toast) => toast.id !== id));
    }, 2600);
  };

  const focusSegment = (segmentId: number) => {
    setActiveSegmentId(segmentId);
    setHighlightSegmentId(segmentId);
    const node = segmentRefs.current.get(segmentId);
    node?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => setHighlightSegmentId(null), 1600);
  };

  const handleStreamEvent = (event: StreamEvent) => {
    if (event.type === "stage_start" && event.stage) {
      setCurrentStage(event.stage);
      setStageStatus((prev) => ({ ...prev, [event.stage!]: "running" }));
      queueToast(`${event.stage} started`);
      setTimeline((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          type: "start",
          stage: event.stage,
        },
      ]);
    }

    if (event.type === "stage_complete" && event.stage) {
      setStageStatus((prev) => ({ ...prev, [event.stage!]: "done" }));
      setTimeline((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          type: "complete",
          stage: event.stage,
        },
      ]);
      if (event.stage === "Synthesis") {
        setIsRunning(false);
      }
    }

    if (event.type === "log" && event.message) {
      setLogs((prev) => [...prev, event.message!]);
      setTimeline((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          type: "log",
          message: event.message,
        },
      ]);
    }

    if (event.type === "result" && event.stage && event.payload) {
      switch (event.stage) {
        case "Segmentation":
          setStageA(event.payload as StageA);
          break;
        case "Engagement":
          setStageB(event.payload as StageB);
          break;
        case "Audience Fit":
          setStageC(event.payload as StageC);
          break;
        case "Trends":
          setStageD(event.payload as StageD);
          break;
        case "Synthesis":
          setStageE(event.payload as StageE);
          break;
        default:
          break;
      }
    }

    if (event.type === "error") {
      const stageKey = event.stage ? stageLookup.get(event.stage) : null;
      if (event.stage) {
        setStageStatus((prev) => ({ ...prev, [event.stage!]: "error" }));
      }
      setErrorStage(stageKey ?? null);
      setErrorMessage(event.message ?? "Something went wrong.");
      setTimeline((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          type: "error",
          stage: event.stage,
          message: event.message,
        },
      ]);
      setIsRunning(false);
    }
  };

  const runAnalysis = async (fromStage?: StageKey) => {
    if (!content.trim()) {
      setErrorMessage("Add content to analyze.");
      return;
    }

    setIsRunning(true);
    setErrorMessage(null);
    setErrorStage(null);
    setCurrentStage(null);
    if (!fromStage) resetState();

    const payload = {
      content,
      fromStage,
      previous: {
        stageA,
        stageB,
        stageC,
        stageD,
      },
    };

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        setErrorMessage(error.error ?? "Failed to start analysis.");
        setIsRunning(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setErrorMessage("Streaming not supported in this browser.");
        setIsRunning(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line) as StreamEvent;
            handleStreamEvent(event);
          } catch (error) {
            console.error("Stream parse error", error);
          }
        }
      }
    } catch (error) {
      console.error(error);
      setErrorMessage("Network error while streaming analysis.");
    } finally {
      setIsRunning(false);
    }
  };

  const handleExportPdf = async () => {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current, {
      scale: 2,
      backgroundColor: "#f8f9ff",
    });
    const image = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "pt", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(image, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save("creator-content-radar-report.pdf");
  };

  const handleOnboardingDismiss = () => {
    setHasOnboarded(true);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("ccr_onboarded", "true");
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50">
      <div className="absolute inset-0 bg-hero-gradient opacity-80" />
      <div className="absolute inset-0 bg-blobs pointer-events-none" />
      <motion.div
        className="pointer-events-none absolute left-10 top-40 h-40 w-40 rounded-full bg-glow-cyan/30 blur-3xl"
        animate={{ y: [0, -20, 0] }}
        transition={{ repeat: Infinity, duration: 8 }}
      />
      <motion.div
        className="pointer-events-none absolute bottom-24 right-12 h-52 w-52 rounded-full bg-glow-emerald/30 blur-3xl"
        animate={{ y: [0, 18, 0] }}
        transition={{ repeat: Infinity, duration: 10 }}
      />

      <DynamicIsland
        currentStage={currentStage}
        progress={statusProgress}
        isRunning={isRunning}
      />

      <AnimatePresence>
        {!hasOnboarded && (
          <OnboardingOverlay onClose={handleOnboardingDismiss} />
        )}
      </AnimatePresence>

      <main className="relative z-10">
        <section className="px-6 pt-16 pb-10 lg:px-16">
          <motion.div
            style={{ y: heroOffset }}
            className="glass-card card-hover gradient-border shimmer relative overflow-hidden rounded-3xl border border-white/60 p-10 lg:p-14"
          >
            <div className="absolute right-8 top-10 hidden h-28 w-28 rounded-full bg-glow-cyan/30 blur-2xl lg:block" />
            <div className="absolute left-8 top-6 hidden h-20 w-20 rounded-full bg-glow-violet/40 blur-2xl lg:block" />
            <AnimatedSticker className="right-6 top-6" />
            <AnimatedSticker className="bottom-6 left-6" variant="emerald" />
            <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
              <div>
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7 }}
                  className="text-4xl font-semibold text-slate-900 lg:text-6xl"
                >
                  Creator Content Radar
                  <span className="block bg-gradient-to-r from-cyan-500 via-indigo-500 to-violet-500 bg-clip-text text-transparent">
                    Premium performance insight, streaming live.
                  </span>
                </motion.h1>
                <p className="mt-4 max-w-2xl text-lg text-slate-600">
                  Decode structure, predict engagement, and align with trends in a
                  multi-stage pipeline. Every panel lights up as the analysis
                  happens in real time.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <motion.button
                    layout
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => runAnalysis()}
                    className="relative flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-violet-500 px-6 py-3 text-sm font-semibold text-white shadow-glow transition"
                    disabled={isRunning}
                  >
                    <AnimatePresence mode="wait">
                      {isRunning ? (
                        <motion.span
                          key="running"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          className="flex items-center gap-2"
                        >
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Running analysis
                        </motion.span>
                      ) : (
                        <motion.span
                          key="idle"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          className="flex items-center gap-2"
                        >
                          <Sparkles className="h-4 w-4" />
                          Analyze Content
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() =>
                      finalRef.current?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      })
                    }
                    className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-6 py-3 text-sm font-semibold text-slate-700 shadow-soft"
                  >
                    Generate Rewrite Plan
                    <ChevronRight className="h-4 w-4" />
                  </motion.button>
                </div>
              </div>
              <div className="grid gap-4">
                {onboardingSteps.map((step) => (
                  <motion.div
                    key={step.title}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="glass-card card-hover rounded-2xl border border-white/60 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
                        <step.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {step.title}
                        </div>
                        <div className="text-xs text-slate-600">
                          {step.detail}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </section>

        <section className="px-6 pb-16 lg:px-16">
          <div className="animated-divider mb-6" />
          <div className="grid gap-6 lg:grid-cols-[1.1fr_1.4fr_1.1fr]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="flex flex-col gap-6"
            >
              <div className="glass-card card-hover rounded-2xl border border-white/60 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      Content Input
                    </div>
                    <div className="text-xs text-slate-500">
                      Paste your script or post below.
                    </div>
                  </div>
                  <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                    {wordCount} words · {charCount} chars
                  </span>
                </div>
                <textarea
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="Paste your content here..."
                  className="mt-4 h-52 w-full resize-none rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm text-slate-700 shadow-inner focus:outline-none focus:ring-2 focus:ring-cyan-400"
                />
                <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                  <span>Live validation + sanitization enabled</span>
                  <span className="flex items-center gap-2">
                    <Flame className="h-4 w-4 text-amber-500" />
                    {Math.min(100, Math.round((wordCount / 300) * 100))}% of ideal
                  </span>
                </div>
              </div>

              <div className="glass-card card-hover rounded-2xl border border-white/60 p-6">
                <div className="text-sm font-semibold text-slate-900">
                  Quick Tips
                </div>
                <ul className="mt-3 space-y-2 text-xs text-slate-600">
                  {[
                    "Lead with a sharp hook within the first 2 lines.",
                    "Clarify the payoff before the midpoint.",
                    "End with a single call-to-action.",
                    "Match tone to audience expectations.",
                  ].map((tip) => (
                    <li key={tip} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="glass-card card-hover rounded-2xl border border-white/60 p-6">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-900">
                    Segment Timeline
                  </div>
                  <span className="text-xs text-slate-500">
                    {stageA?.segments.length ?? 0} segments
                  </span>
                </div>
                <div className="mt-4 max-h-[360px] space-y-3 overflow-auto pr-2">
                  {stageA?.segments.map((segment) => (
                    <motion.div
                      key={segment.id}
                      ref={(node) => {
                        if (node) segmentRefs.current.set(segment.id, node);
                      }}
                      onClick={() => focusSegment(segment.id)}
                      whileHover={{ scale: 1.01 }}
                      className={cn(
                        "cursor-pointer rounded-2xl border border-white/70 bg-white/80 p-3 text-xs shadow-soft transition",
                        activeSegmentId === segment.id &&
                          "ring-2 ring-cyan-400 active-glow",
                        highlightSegmentId === segment.id &&
                          "animate-pulseGlow"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          Segment {segment.id}
                        </span>
                        <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] text-white">
                          {segment.purpose}
                        </span>
                      </div>
                      <p className="mt-2 text-slate-700">
                        {segment.text}
                      </p>
                    </motion.div>
                  ))}
                  {!stageA?.segments.length && (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">
                      Segments will appear here after Stage A.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="flex flex-col gap-6"
            >
              <div className="glass-card card-hover rounded-2xl border border-white/60 p-6">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-900">
                    Live Execution Timeline
                  </div>
                  <span className="flex items-center gap-2 text-xs text-slate-500">
                    <Hourglass className="h-4 w-4" />
                    {isRunning ? "Running" : "Idle"}
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  {STAGES.map((stage) => {
                    const status = stageStatus[stage.name];
                    const Icon = stage.icon;
                    return (
                      <motion.div
                        key={stage.name}
                        className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/70 p-3"
                        whileHover={{ scale: 1.01 }}
                      >
                        <div
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-xl text-white",
                            status === "done" && "bg-emerald-500",
                            status === "running" && "bg-indigo-500",
                            status === "error" && "bg-rose-500",
                            status === "idle" && "bg-slate-300"
                          )}
                        >
                          <motion.div
                            animate={
                              status === "running"
                                ? { rotate: [0, 10, -10, 0] }
                                : { rotate: 0 }
                            }
                            transition={{
                              repeat: status === "running" ? Infinity : 0,
                              duration: 1.6,
                            }}
                          >
                            <Icon className="h-5 w-5" />
                          </motion.div>
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-slate-800">
                            {stage.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {stage.description}
                          </div>
                        </div>
                        <span
                          className={cn(
                            "rounded-full px-2 py-1 text-[10px] font-semibold uppercase",
                            status === "done" && "bg-emerald-100 text-emerald-700",
                            status === "running" && "bg-indigo-100 text-indigo-700",
                            status === "error" && "bg-rose-100 text-rose-700",
                            status === "idle" && "bg-slate-100 text-slate-500"
                          )}
                        >
                          {status}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              <div className="glass-card card-hover rounded-2xl border border-white/60 p-6">
                <div className="text-sm font-semibold text-slate-900">
                  Streaming Logs
                </div>
                <div className="mt-4 max-h-[260px] space-y-2 overflow-auto rounded-2xl border border-slate-100 bg-white/70 p-3 text-xs text-slate-600">
                  {logs.map((log, index) => (
                    <div key={`${log}-${index}`} className="flex gap-2">
                      <span className="text-slate-400">•</span>
                      <span>{log}</span>
                    </div>
                  ))}
                  {!logs.length && (
                    <div className="text-center text-xs text-slate-400">
                      Logs stream in once analysis starts.
                    </div>
                  )}
                  <div ref={logsEndRef} />
                </div>
              </div>

              <div className="glass-card card-hover rounded-2xl border border-white/60 p-6">
                <div className="text-sm font-semibold text-slate-900">
                  Timeline Events
                </div>
                <div className="mt-4 max-h-[240px] space-y-2 overflow-auto text-xs text-slate-600">
                  {timeline.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-start gap-2 rounded-xl p-2",
                        item.type === "error" &&
                          "bg-rose-50 text-rose-700"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-1 h-2 w-2 rounded-full",
                          item.type === "error"
                            ? "bg-rose-400"
                            : "bg-indigo-400"
                        )}
                      />
                      <div>
                        <div className="font-semibold text-slate-700">
                          {item.stage ?? "System"} · {item.type}
                        </div>
                        {item.message && <div>{item.message}</div>}
                      </div>
                    </div>
                  ))}
                  {!timeline.length && (
                    <div className="text-center text-xs text-slate-400">
                      Timeline events will appear here.
                    </div>
                  )}
                  <div ref={timelineEndRef} />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-col gap-6"
              ref={reportRef}
            >
              <div className="glass-card card-hover rounded-2xl border border-white/60 p-6">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-900">
                    Segment Insights
                  </div>
                  <BarChart3 className="h-4 w-4 text-slate-400" />
                </div>
                <div className="mt-4 space-y-3 text-xs text-slate-600">
                  {stageB?.dropOffRisks.map((risk) => (
                    <motion.div
                      key={`${risk.segmentId}-${risk.reason}`}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => focusSegment(risk.segmentId)}
                      className="cursor-pointer rounded-2xl border border-white/60 bg-white/70 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-700">
                          Segment {risk.segmentId}
                        </span>
                        <SeverityBadge severity={risk.severity} />
                      </div>
                      <div className="mt-2">{risk.reason}</div>
                    </motion.div>
                  ))}
                  {!stageB?.dropOffRisks.length && (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
                      Engagement risks will appear here.
                    </div>
                  )}
                </div>
              </div>

              <div className="glass-card card-hover rounded-2xl border border-white/60 p-6">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-900">
                    Engagement & Tone
                  </div>
                  <Activity className="h-4 w-4 text-slate-400" />
                </div>
                <div className="mt-4 space-y-3 text-xs text-slate-600">
                  {stageB?.engagementIssues.map((issue) => (
                    <div
                      key={issue.issue}
                      className="cursor-pointer rounded-2xl border border-white/60 bg-white/70 p-3"
                      onClick={() => focusSegment(issue.segmentId)}
                    >
                      <div className="text-[10px] font-semibold uppercase text-slate-500">
                        Segment {issue.segmentId}
                      </div>
                      <div className="mt-2">{issue.issue}</div>
                    </div>
                  ))}
                  {stageC?.toneProblems.map((tone) => (
                    <div
                      key={tone}
                      className="rounded-2xl border border-white/60 bg-white/70 p-3"
                    >
                      <div className="text-[10px] font-semibold uppercase text-slate-500">
                        Tone risk
                      </div>
                      <div className="mt-2">{tone}</div>
                    </div>
                  ))}
                  {stageC?.audienceMismatch.map((mismatch) => (
                    <div
                      key={mismatch}
                      className="rounded-2xl border border-white/60 bg-white/70 p-3"
                    >
                      <div className="text-[10px] font-semibold uppercase text-slate-500">
                        Audience mismatch
                      </div>
                      <div className="mt-2">{mismatch}</div>
                    </div>
                  ))}
                  {!stageB?.engagementIssues.length &&
                    !stageC?.toneProblems.length &&
                    !stageC?.audienceMismatch.length && (
                      <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
                        Engagement and tone signals will appear here.
                      </div>
                    )}
                </div>
              </div>

              <div className="glass-card card-hover rounded-2xl border border-white/60 p-6">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-900">
                    Trend & Saturation
                  </div>
                  <TrendingUp className="h-4 w-4 text-slate-400" />
                </div>
                <div className="mt-4 space-y-3 text-xs text-slate-600">
                  {stageD?.currentTrends.map((trend) => (
                    <div
                      key={trend}
                      className="rounded-2xl border border-white/60 bg-white/70 p-3"
                    >
                      {trend}
                    </div>
                  ))}
                  {stageD?.saturationSignals.map((signal) => (
                    <div
                      key={signal}
                      className="rounded-2xl border border-white/60 bg-white/70 p-3"
                    >
                      <div className="text-[10px] font-semibold uppercase text-slate-500">
                        Saturation signal
                      </div>
                      <div className="mt-2">{signal}</div>
                    </div>
                  ))}
                  {stageD?.similarPopularFormats.map((format) => (
                    <div
                      key={format}
                      className="rounded-2xl border border-white/60 bg-white/70 p-3"
                    >
                      <div className="text-[10px] font-semibold uppercase text-slate-500">
                        Popular format
                      </div>
                      <div className="mt-2">{format}</div>
                    </div>
                  ))}
                  {!stageD?.currentTrends.length && (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
                      Trend analysis will appear here.
                    </div>
                  )}
                </div>
              </div>

              <motion.div
                ref={finalRef}
                className="glass-card card-hover rounded-2xl border border-white/60 p-6"
                whileHover={{ scale: 1.01 }}
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-900">
                    Final Synthesis
                  </div>
                  <PotentialBadge potential={stageE?.overallPotential} />
                </div>
                <div className="mt-4 space-y-3 text-xs text-slate-600">
                  {stageE?.highestImpactFixes.map((fix, index) => (
                    <motion.div
                      key={fix}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-start gap-2 rounded-2xl border border-white/60 bg-white/70 p-3"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                      <span>{fix}</span>
                    </motion.div>
                  ))}
                  {!stageE?.highestImpactFixes.length && (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
                      Final synthesis will appear here.
                    </div>
                  )}
                </div>
                {stageE?.rewritePriorities.length ? (
                  <div className="mt-4 space-y-3 text-xs text-slate-600">
                    <div className="text-[11px] font-semibold uppercase text-slate-500">
                      Rewrite priorities
                    </div>
                    {stageE.rewritePriorities.map((priority) => (
                      <div
                        key={`${priority.segmentId}-${priority.recommendedChange}`}
                        className="cursor-pointer rounded-2xl border border-white/60 bg-white/70 p-3"
                        onClick={() => focusSegment(priority.segmentId)}
                      >
                        <div className="text-[10px] font-semibold uppercase text-slate-500">
                          Segment {priority.segmentId}
                        </div>
                        <div className="mt-2 font-semibold text-slate-700">
                          {priority.recommendedChange}
                        </div>
                        <div className="mt-1 text-slate-500">
                          {priority.expectedImpact}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
                {stageE?.contentPositioningAdvice.length ? (
                  <div className="mt-4 space-y-2 text-xs text-slate-600">
                    <div className="text-[11px] font-semibold uppercase text-slate-500">
                      Positioning advice
                    </div>
                    {stageE.contentPositioningAdvice.map((advice) => (
                      <div
                        key={advice}
                        className="rounded-2xl border border-white/60 bg-white/70 p-3"
                      >
                        {advice}
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleExportPdf}
                    className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
                  >
                    Export PDF
                  </motion.button>
                  {stageE?.rewritePriorities.length ? (
                    <span className="rounded-full bg-emerald-100 px-3 py-2 text-[10px] font-semibold uppercase text-emerald-700">
                      {stageE.rewritePriorities.length} priority fixes
                    </span>
                  ) : null}
                </div>
              </motion.div>

              <div className="glass-card card-hover sticky top-24 rounded-2xl border border-white/60 p-6">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-900">
                    Active Segment
                  </div>
                  <Layers className="h-4 w-4 text-slate-400" />
                </div>
                {segmentIssues ? (
                  <div className="mt-4 space-y-3 text-xs text-slate-600">
                    {segmentIssues.dropOff.map((risk) => (
                      <div
                        key={risk.reason}
                        className="rounded-2xl border border-white/60 bg-white/70 p-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-700">
                            Drop-off risk
                          </span>
                          <SeverityBadge severity={risk.severity} />
                        </div>
                        <p className="mt-2">{risk.reason}</p>
                      </div>
                    ))}
                    {segmentIssues.engagement.map((issue) => (
                      <div
                        key={issue.issue}
                        className="rounded-2xl border border-white/60 bg-white/70 p-3"
                      >
                        <div className="font-semibold text-slate-700">
                          Engagement issue
                        </div>
                        <p className="mt-2">{issue.issue}</p>
                      </div>
                    ))}
                    {segmentIssues.clarity.map((issue) => (
                      <div
                        key={issue.problem}
                        className="rounded-2xl border border-white/60 bg-white/70 p-3"
                      >
                        <div className="font-semibold text-slate-700">
                          Clarity problem
                        </div>
                        <p className="mt-2">{issue.problem}</p>
                      </div>
                    ))}
                    {!segmentIssues.dropOff.length &&
                      !segmentIssues.engagement.length &&
                      !segmentIssues.clarity.length && (
                        <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
                          No issues flagged for this segment yet.
                        </div>
                      )}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
                    Click a segment to see its issues.
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <motion.button
              layout
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => runAnalysis(errorStage ?? undefined)}
              className={cn(
                "flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-glow",
                isRunning
                  ? "bg-slate-400"
                  : "bg-gradient-to-r from-cyan-500 via-indigo-500 to-violet-500"
              )}
              disabled={isRunning}
            >
              <AnimatePresence mode="wait">
                {isRunning ? (
                  <motion.span
                    key="running"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="flex items-center gap-2"
                  >
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Running analysis
                  </motion.span>
                ) : (
                  <motion.span
                    key="idle"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="flex items-center gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    {errorStage ? "Retry from failed stage" : "Analyze Content"}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
            {errorMessage && (
              <div className="rounded-full bg-rose-100 px-4 py-2 text-xs font-semibold text-rose-700">
                {errorMessage}
              </div>
            )}
            {stageE?.rewritePriorities.length ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() =>
                  finalRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  })
                }
                className="rounded-full border border-slate-200 bg-white/80 px-5 py-3 text-xs font-semibold text-slate-700"
              >
                Jump to synthesis
              </motion.button>
            ) : null}
          </div>
        </section>
      </main>

      <AnimatePresence>
        {toastQueue.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed right-6 top-24 z-50 rounded-2xl border border-white/60 bg-white/90 px-4 py-3 text-xs font-semibold text-slate-700 shadow-soft"
          >
            {toast.title}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function DynamicIsland({
  currentStage,
  progress,
  isRunning,
}: {
  currentStage: string | null;
  progress: number;
  isRunning: boolean;
}) {
  return (
    <motion.div
      layout
      className={cn(
        "fixed left-1/2 top-6 z-50 -translate-x-1/2 rounded-full border border-white/60 bg-white/80 px-6 py-3 shadow-soft backdrop-blur",
        isRunning ? "min-w-[260px]" : "min-w-[200px]"
      )}
      animate={{
        scale: isRunning ? 1.02 : 1,
      }}
    >
      <div className="flex items-center justify-between gap-4 text-xs font-semibold text-slate-700">
        <span className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-indigo-500" />
          {currentStage ?? "Ready to analyze"}
        </span>
        <span>{progress}%</span>
      </div>
      <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200">
        <motion.div
          className="h-1.5 rounded-full bg-gradient-to-r from-cyan-400 via-indigo-400 to-violet-400"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>
    </motion.div>
  );
}

function SeverityBadge({ severity }: { severity: "low" | "medium" | "high" }) {
  const styles = {
    low: "bg-emerald-100 text-emerald-700",
    medium: "bg-amber-100 text-amber-700",
    high: "bg-rose-100 text-rose-700",
  };
  return (
    <motion.span
      animate={
        severity === "high"
          ? { scale: [1, 1.05, 1] }
          : { scale: 1 }
      }
      transition={{ repeat: Infinity, duration: 1.8 }}
      className={cn(
        "rounded-full px-2 py-1 text-[10px] font-semibold uppercase",
        styles[severity]
      )}
    >
      {severity}
    </motion.span>
  );
}

function PotentialBadge({ potential }: { potential?: "low" | "medium" | "high" }) {
  if (!potential) {
    return (
      <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold uppercase text-slate-500">
        Pending
      </span>
    );
  }
  const styles = {
    low: "bg-rose-100 text-rose-700",
    medium: "bg-amber-100 text-amber-700",
    high: "bg-emerald-100 text-emerald-700",
  };
  return (
    <motion.span
      animate={{ scale: [1, 1.06, 1] }}
      transition={{ repeat: Infinity, duration: 2.2 }}
      className={cn(
        "rounded-full px-3 py-1 text-[10px] font-semibold uppercase",
        styles[potential]
      )}
    >
      {potential} potential
    </motion.span>
  );
}

function OnboardingOverlay({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-6 backdrop-blur"
    >
      <motion.div
        initial={{ scale: 0.96, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.96, y: 20, opacity: 0 }}
        className="glass-card max-w-2xl rounded-3xl border border-white/60 p-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">
              Welcome to Creator Content Radar
            </div>
            <div className="text-xs text-slate-500">
              A quick tour before you dive in.
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClose}
            className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
          >
            Start analyzing
          </motion.button>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {onboardingSteps.map((step) => (
            <div
              key={step.title}
              className="rounded-2xl border border-white/60 bg-white/80 p-4"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
                <step.icon className="h-5 w-5" />
              </div>
              <div className="mt-3 text-sm font-semibold text-slate-800">
                {step.title}
              </div>
              <div className="mt-1 text-xs text-slate-500">{step.detail}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

function AnimatedSticker({
  className,
  variant = "cyan",
}: {
  className?: string;
  variant?: "cyan" | "emerald";
}) {
  const colors =
    variant === "emerald"
      ? "from-emerald-400 via-emerald-200 to-cyan-200"
      : "from-cyan-400 via-indigo-300 to-violet-300";
  return (
    <motion.div
      animate={{ y: [0, -10, 0], rotate: [0, 4, -4, 0] }}
      transition={{ repeat: Infinity, duration: 6 }}
      className={cn(
        "absolute hidden h-16 w-16 items-center justify-center rounded-2xl bg-white/70 shadow-soft lg:flex",
        className
      )}
    >
      <div
        className={cn(
          "h-10 w-10 rounded-xl bg-gradient-to-br opacity-90",
          colors
        )}
      />
    </motion.div>
  );
}
