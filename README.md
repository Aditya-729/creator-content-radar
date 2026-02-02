# Creator Content Radar

Premium creator analytics with a multi-stage, streaming pipeline that runs end-to-end on Next.js 14 App Router. The UI is designed to feel bright, dense, playful, and modern while streaming live insights in real time.

## Features
- Multi-stage analysis pipeline (A–E) with live streaming updates.
- Dynamic Island status pill and animated stage tracker.
- Segment-aware timeline with smooth scrolling and glow focus.
- Trend and saturation analysis via Perplexity.
- PDF export for the final synthesis panel.
- Glassmorphism UI, motion polish, and scroll-triggered animations.

## Tech Stack
- Next.js 14 App Router
- Tailwind CSS
- Framer Motion
- TypeScript

## Installation
```bash
npm install
```

## Environment Variables
Create a `.env.local` file in the project root:

```bash
MINO_API_URL=your_mino_endpoint
MINO_API_KEY=your_mino_key
PERPLEXITY_API_KEY=your_perplexity_key
```

Notes:
- `MINO_API_URL` should point to your Mino inference endpoint.
- The backend expects JSON responses matching each stage contract (see below).
- No secrets are exposed to the client.

## Development
```bash
npm run dev
```

## Build
```bash
npm run build
npm run start
```

## Streaming Architecture
The `POST /api/analyze` endpoint streams newline-delimited JSON (NDJSON) over a `ReadableStream`.

Each event is emitted as:
```json
{ "type": "stage_start", "stage": "Segmentation" }
{ "type": "log", "message": "..." }
{ "type": "stage_complete", "stage": "Segmentation" }
{ "type": "result", "stage": "Segmentation", "payload": { ... } }
```

The frontend consumes the stream via `fetch()` + `ReadableStream` reader and updates UI panels in real time.

## Stage Flow

### Stage A — Content segmentation (Mino)
Input: raw content  
Output:
```json
{
  "segments": [
    {
      "id": 1,
      "text": "string",
      "purpose": "hook|context|story|value|cta|other"
    }
  ]
}
```

### Stage B — Engagement risks (Mino)
Input: segments  
Output:
```json
{
  "dropOffRisks": [
    {
      "segmentId": 1,
      "reason": "string",
      "severity": "low|medium|high"
    }
  ],
  "engagementIssues": [
    {
      "segmentId": 1,
      "issue": "string"
    }
  ]
}
```

### Stage C — Audience fit + tone (Mino)
Output:
```json
{
  "audienceMismatch": ["string"],
  "clarityIssues": [
    {
      "segmentId": 1,
      "problem": "string"
    }
  ],
  "toneProblems": ["string"]
}
```

### Stage D — Trends + saturation (Perplexity)
Input: main topic inferred from the content  
Output:
```json
{
  "currentTrends": ["string"],
  "saturationSignals": ["string"],
  "similarPopularFormats": ["string"]
}
```

### Stage E — Final synthesis (Mino)
Output:
```json
{
  "overallPotential": "low|medium|high",
  "highestImpactFixes": ["string"],
  "rewritePriorities": [
    {
      "segmentId": 1,
      "recommendedChange": "string",
      "expectedImpact": "string"
    }
  ],
  "contentPositioningAdvice": ["string"]
}
```

## Deployment on Vercel
1. Push the repository to GitHub.
2. Create a new Vercel project.
3. Add the environment variables from `.env.local` to Vercel.
4. Deploy.

The streaming API route is compatible with Vercel’s Edge/Node runtime and will emit NDJSON events for the frontend.

## Stability fixes
- Sanitize helper consolidation.
- JSX duplicate attribute fix.
- Perplexity model fix.
- Word + character counter display.

## Sanity checks & local pipeline test
Run the app locally:
```bash
npm run dev
```

In a second terminal, run the streaming sanity script:
```bash
node scripts/sanity-check.ts
```

Expected output:
- Console logs for each NDJSON event (`stage_start`, `stage_complete`, `result`)
- A final `Sanity check passed.` message
