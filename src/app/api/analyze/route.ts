import { NextRequest } from "next/server";
import { runMinoStage } from "@/lib/mino";
import { runPerplexityStage } from "@/lib/perplexity";
import {
  stageASchema,
  stageBSchema,
  stageCSchema,
  stageDSchema,
  stageESchema,
  type StageA,
  type StageB,
  type StageC,
  type StageD,
  type StageE,
} from "@/lib/schemas";
import { sanitizeUserInput } from "@/lib/sanitize";

type StageKey = "A" | "B" | "C" | "D" | "E";

export const runtime = "nodejs";

type AnalyzePayload = {
  content?: string;
  fromStage?: StageKey;
  previous?: {
    stageA?: StageA;
    stageB?: StageB;
    stageC?: StageC;
    stageD?: StageD;
  };
};

const STAGE_ORDER: StageKey[] = ["A", "B", "C", "D", "E"];

const stageNames: Record<StageKey, string> = {
  A: "Segmentation",
  B: "Engagement",
  C: "Audience Fit",
  D: "Trends",
  E: "Synthesis",
};

const minoSchemas = {
  stageA: {
    segments: [
      {
        id: "number",
        text: "string",
        purpose: "hook|context|story|value|cta|other",
      },
    ],
  },
  stageB: {
    dropOffRisks: [
      {
        segmentId: "number",
        reason: "string",
        severity: "low|medium|high",
      },
    ],
    engagementIssues: [
      {
        segmentId: "number",
        issue: "string",
      },
    ],
  },
  stageC: {
    audienceMismatch: ["string"],
    clarityIssues: [
      {
        segmentId: "number",
        problem: "string",
      },
    ],
    toneProblems: ["string"],
  },
  stageE: {
    overallPotential: "low|medium|high",
    highestImpactFixes: ["string"],
    rewritePriorities: [
      {
        segmentId: "number",
        recommendedChange: "string",
        expectedImpact: "string",
      },
    ],
    contentPositioningAdvice: ["string"],
  },
};

function inferTopic(content: string) {
  const firstLine = content.split(/[\n.!?]/).find(Boolean) ?? content;
  return firstLine.split(" ").slice(0, 12).join(" ");
}

export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => ({}))) as AnalyzePayload;
  const sanitized = sanitizeUserInput(payload.content ?? "");

  if (!sanitized) {
    return Response.json(
      { error: "Please provide content to analyze." },
      { status: 400 }
    );
  }

  const startStage = payload.fromStage ?? "A";
  const startIndex = STAGE_ORDER.indexOf(startStage);
  const previous = payload.previous ?? {};

  if (startIndex > 0 && !previous.stageA) {
    return Response.json(
      { error: "Missing Stage A output for retry." },
      { status: 400 }
    );
  }
  if (startIndex > 1 && !previous.stageB) {
    return Response.json(
      { error: "Missing Stage B output for retry." },
      { status: 400 }
    );
  }
  if (startIndex > 2 && !previous.stageC) {
    return Response.json(
      { error: "Missing Stage C output for retry." },
      { status: 400 }
    );
  }
  if (startIndex > 3 && !previous.stageD) {
    return Response.json(
      { error: "Missing Stage D output for retry." },
      { status: 400 }
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(data)}\n`));
      };

      const runStage = async <T,>(
        stageKey: StageKey,
        runner: () => Promise<T>
      ): Promise<T> => {
        send({ type: "stage_start", stage: stageNames[stageKey] });
        try {
          const result = await runner();
          send({
            type: "result",
            stage: stageNames[stageKey],
            payload: result,
          });
          send({ type: "stage_complete", stage: stageNames[stageKey] });
          return result;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unknown error";
          send({ type: "error", stage: stageNames[stageKey], message });
          controller.close();
          throw error;
        }
      };

      try {
        let stageA = previous.stageA;
        let stageB = previous.stageB;
        let stageC = previous.stageC;
        let stageD = previous.stageD;
        let stageE: StageE | undefined;

        if (startIndex <= 0) {
          send({
            type: "log",
            message: "Splitting content into structural segments.",
          });
          stageA = await runStage("A", async () => {
            const response = await runMinoStage<StageA>({
              stage: "A",
              input: { content: sanitized },
              schema: minoSchemas.stageA,
              instructions:
                "Segment the content into meaningful blocks. Return strict JSON only.",
            });
            return stageASchema.parse(response);
          });
        }

        if (startIndex <= 1) {
          send({
            type: "log",
            message: "Evaluating engagement risks and drop-off triggers.",
          });
          stageB = await runStage("B", async () => {
            const response = await runMinoStage<StageB>({
              stage: "B",
              input: { segments: stageA?.segments ?? [] },
              schema: minoSchemas.stageB,
              instructions:
                "Analyze engagement risks for each segment. Return strict JSON only.",
            });
            return stageBSchema.parse(response);
          });
        }

        if (startIndex <= 2) {
          send({
            type: "log",
            message: "Checking audience fit, clarity, and tone.",
          });
          stageC = await runStage("C", async () => {
            const response = await runMinoStage<StageC>({
              stage: "C",
              input: { segments: stageA?.segments ?? [] },
              schema: minoSchemas.stageC,
              instructions:
                "Assess audience mismatch, clarity problems, and tone. Return strict JSON only.",
            });
            return stageCSchema.parse(response);
          });
        }

        if (startIndex <= 3) {
          send({
            type: "log",
            message: "Pulling live trend and saturation signals.",
          });
          stageD = await runStage("D", async () => {
            const topic = inferTopic(sanitized);
            const response = await runPerplexityStage<StageD>(
              "You are a trends analyst for creator content. Respond with strict JSON only.",
              `Analyze current trends and saturation for the topic: "${topic}". Return JSON with currentTrends, saturationSignals, similarPopularFormats arrays.`
            );
            return stageDSchema.parse(response);
          });
        }

        if (startIndex <= 4) {
          send({
            type: "log",
            message: "Synthesizing final rewrite priorities.",
          });
          stageE = await runStage("E", async () => {
            const response = await runMinoStage<StageE>({
              stage: "E",
              input: {
                stageA,
                stageB,
                stageC,
                stageD,
              },
              schema: minoSchemas.stageE,
              instructions:
                "Synthesize a final diagnosis with rewrite priorities. Return strict JSON only.",
            });
            return stageESchema.parse(response);
          });
        }

        send({
          type: "log",
          message: "Analysis complete. Ready for next actions.",
        });
        controller.close();
      } catch (error) {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
