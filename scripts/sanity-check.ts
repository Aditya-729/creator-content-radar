const SAMPLE_CONTENT =
  "Hook: Learn how to design a creator content pipeline in 10 minutes.\n" +
  "Context: We tested 50 posts across platforms.\n" +
  "Value: Here are the patterns that consistently boost retention.\n" +
  "CTA: Try these steps in your next post.";

async function run() {
  const response = await fetch("http://localhost:3000/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: SAMPLE_CONTENT }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Sanity check failed: ${response.status} ${text}`);
  }

  if (!response.body) {
    throw new Error("Sanity check failed: response body is missing.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  let stageStarts = 0;
  let stageCompletes = 0;
  let results = 0;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line);
      const stageInfo = event.stage ? ` (${event.stage})` : "";
      console.log(`[event] ${event.type}${stageInfo}`);
      if (event.type === "stage_start") stageStarts += 1;
      if (event.type === "stage_complete") stageCompletes += 1;
      if (event.type === "result") results += 1;
    }
  }

  if (!stageStarts || !stageCompletes || !results) {
    throw new Error(
      `Sanity check failed: events missing (starts=${stageStarts}, completes=${stageCompletes}, results=${results}).`
    );
  }

  console.log("Sanity check passed.");
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
