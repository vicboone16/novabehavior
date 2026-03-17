import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function toBase64(str: string) {
  return btoa(unescape(encodeURIComponent(str)));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const { task_id } = await req.json();

    if (!task_id) {
      return jsonResponse({ error: "task_id is required" }, 400);
    }

    const { data: task, error: taskError } = await supabase
      .from("command_tasks")
      .select("*")
      .eq("id", task_id)
      .single();

    if (taskError || !task) {
      return jsonResponse({ error: "Task not found" }, 404);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const path = `automation/tasks/${timestamp}-${task.app_slug}-${task.command_name}.md`;

    const content = `# Task: ${task.command_name}

**App:** ${task.app_slug}
**Priority:** ${task.priority}
**Created by:** ${task.created_by ?? "unknown"}
**Created at:** ${task.created_at}

## Payload
\`\`\`json
${JSON.stringify(task.command_payload ?? {}, null, 2)}
\`\`\`

## Required handling
- Review project knowledge first
- Preserve production flows
- Prefer surgical fixes
- Do not rename shared tables or columns without a safe migration
- Summarize what changed
`;

    const githubRes = await fetch(
      `https://api.github.com/repos/${task.repo_owner}/${task.repo_name}/contents/${path}`,
      {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${GITHUB_TOKEN}`,
          "Accept": "application/vnd.github+json",
          "Content-Type": "application/json",
          "User-Agent": "supabase-edge-function",
        },
        body: JSON.stringify({
          message: `Add automation task file for ${task.app_slug} / ${task.command_name}`,
          content: toBase64(content),
          branch: "main",
        }),
      }
    );

    const githubJson = await githubRes.json();

    if (!githubRes.ok) {
      return jsonResponse({ error: "Failed to create task file", github: githubJson }, 500);
    }

    await supabase
      .from("command_tasks")
      .update({
        task_file_path: path,
        output_summary: `Task file created at ${path}`,
      })
      .eq("id", task.id);

    return jsonResponse({
      success: true,
      path,
      commit_url: githubJson.commit?.html_url ?? null,
    });
  } catch (error) {
    return jsonResponse({
      error: "Unexpected server error",
      details: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});
