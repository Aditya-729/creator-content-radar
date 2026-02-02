import { z } from "zod";

export const segmentSchema = z.object({
  id: z.number(),
  text: z.string(),
  purpose: z.enum(["hook", "context", "story", "value", "cta", "other"]),
});

export const stageASchema = z.object({
  segments: z.array(segmentSchema).min(1),
});

export const stageBSchema = z.object({
  dropOffRisks: z.array(
    z.object({
      segmentId: z.number(),
      reason: z.string(),
      severity: z.enum(["low", "medium", "high"]),
    })
  ),
  engagementIssues: z.array(
    z.object({
      segmentId: z.number(),
      issue: z.string(),
    })
  ),
});

export const stageCSchema = z.object({
  audienceMismatch: z.array(z.string()),
  clarityIssues: z.array(
    z.object({
      segmentId: z.number(),
      problem: z.string(),
    })
  ),
  toneProblems: z.array(z.string()),
});

export const stageDSchema = z.object({
  currentTrends: z.array(z.string()),
  saturationSignals: z.array(z.string()),
  similarPopularFormats: z.array(z.string()),
});

export const stageESchema = z.object({
  overallPotential: z.enum(["low", "medium", "high"]),
  highestImpactFixes: z.array(z.string()),
  rewritePriorities: z.array(
    z.object({
      segmentId: z.number(),
      recommendedChange: z.string(),
      expectedImpact: z.string(),
    })
  ),
  contentPositioningAdvice: z.array(z.string()),
});

export type StageA = z.infer<typeof stageASchema>;
export type StageB = z.infer<typeof stageBSchema>;
export type StageC = z.infer<typeof stageCSchema>;
export type StageD = z.infer<typeof stageDSchema>;
export type StageE = z.infer<typeof stageESchema>;
