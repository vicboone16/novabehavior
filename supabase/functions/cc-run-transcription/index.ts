import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Internal stage function — called by cc-process-recording with service-role key.
 * Does NOT call auth.getClaims. Validates recording via service-role DB access.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      return new Response(JSON.stringify({ error: "Transcription service not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { recording_id, org_id, transcript_version = 1, audio_storage_path } = await req.json();
    if (!recording_id || !org_id) {
      return new Response(JSON.stringify({ error: "recording_id and org_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Validate recording
    const { data: recording, error: recErr } = await supabase
      .from("voice_recordings")
      .select("id, org_id, language_mode, secure_storage_path")
      .eq("id", recording_id)
      .single();

    if (recErr || !recording) {
      return new Response(JSON.stringify({ error: "Recording not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (recording.org_id && recording.org_id !== org_id) {
      return new Response(JSON.stringify({ error: "Access denied" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create AI run
    const { data: aiRun } = await supabase.from("voice_ai_runs").insert({
      recording_id,
      run_type: "transcription",
      model_name: "scribe_v2",
      status: "running",
      started_at: new Date().toISOString(),
    }).select().single();

    await supabase.from("voice_recordings").update({ transcript_status: "running" }).eq("id", recording_id);

    try {
      // Try merged file first, then fall back to concatenating chunks
      let audioBlob: Uint8Array;
      const storagePath = audio_storage_path || recording.secure_storage_path;

      if (storagePath) {
        const { data: fileData, error: dlErr } = await supabase.storage.from("voice-recordings").download(storagePath);
        if (dlErr || !fileData) {
          throw new Error(`Failed to download audio: ${dlErr?.message || "file not found"}`);
        }
        audioBlob = new Uint8Array(await fileData.arrayBuffer());
      } else {
        // No merged file — download and concatenate chunks in order
        console.log("No merged audio path found, falling back to chunk concatenation");
        const { data: chunks, error: chunksErr } = await supabase
          .from("voice_recording_chunks")
          .select("storage_path, chunk_index")
          .eq("recording_id", recording_id)
          .eq("upload_status", "uploaded")
          .order("chunk_index", { ascending: true });

        if (chunksErr || !chunks || chunks.length === 0) {
          throw new Error(`No audio chunks found for recording ${recording_id}. Record a new session.`);
        }

        console.log(`Found ${chunks.length} chunks to concatenate`);
        const chunkBuffers: Uint8Array[] = [];
        for (const chunk of chunks) {
          const { data: chunkData, error: chunkDlErr } = await supabase.storage
            .from("voice-recordings")
            .download(chunk.storage_path);
          if (chunkDlErr || !chunkData) {
            console.error(`Failed to download chunk ${chunk.chunk_index}: ${chunkDlErr?.message}`);
            continue;
          }
          chunkBuffers.push(new Uint8Array(await chunkData.arrayBuffer()));
        }

        if (chunkBuffers.length === 0) {
          throw new Error("All chunk downloads failed");
        }

        // Concatenate all chunk buffers
        const totalLen = chunkBuffers.reduce((sum, buf) => sum + buf.length, 0);
        audioBlob = new Uint8Array(totalLen);
        let offset = 0;
        for (const buf of chunkBuffers) {
          audioBlob.set(buf, offset);
          offset += buf.length;
        }
        console.log(`Concatenated ${chunkBuffers.length} chunks, total size: ${totalLen} bytes`);
      }

      if (audioBlob.length === 0) {
        throw new Error("Audio file is empty");
      }

      // Call ElevenLabs Scribe v2
      const formData = new FormData();
      formData.append("file", new Blob([audioBlob], { type: "audio/webm" }), "recording.webm");
      formData.append("model_id", "scribe_v2");
      formData.append("diarize", "true");
      formData.append("tag_audio_events", "false");

      // Language handling — language_mode is free TEXT (e.g., "auto", "english", "spanish", "en", "es")
      const langMode = (recording.language_mode || "auto").toLowerCase();
      if (langMode !== "auto") {
        const langMap: Record<string, string> = {
          en: "eng", english: "eng",
          es: "spa", spanish: "spa",
          fr: "fra", french: "fra",
          pt: "por", portuguese: "por",
        };
        const langCode = langMap[langMode];
        if (langCode) formData.append("language_code", langCode);
      }

      const transcribeRes = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
        method: "POST",
        headers: { "xi-api-key": ELEVENLABS_API_KEY },
        body: formData,
      });

      if (!transcribeRes.ok) {
        throw new Error(`Transcription API returned ${transcribeRes.status}: ${await transcribeRes.text()}`);
      }

      const transcription = await transcribeRes.json();
      const fullText = transcription.text || "";

      // Upsert transcript
      const { data: existingTrans } = await supabase
        .from("voice_transcripts")
        .select("id")
        .eq("recording_id", recording_id)
        .eq("version_number", transcript_version)
        .maybeSingle();

      let savedTranscript: any;
      const speakerLabels = transcription.words
        ? [...new Set(transcription.words.map((w: any) => w.speaker).filter(Boolean))]
        : [];

      if (existingTrans) {
        const { data } = await supabase.from("voice_transcripts").update({
          full_text: fullText,
          status: "completed",
          speaker_count: speakerLabels.length,
          created_by_model: "scribe_v2",
          source_language: recording.language_mode || "auto",
        }).eq("id", existingTrans.id).select().single();
        savedTranscript = data;
      } else {
        const { data } = await supabase.from("voice_transcripts").insert({
          recording_id,
          version_number: transcript_version,
          source_language: recording.language_mode || "auto",
          status: "completed",
          full_text: fullText,
          speaker_count: speakerLabels.length,
          created_by_model: "scribe_v2",
        }).select().single();
        savedTranscript = data;
      }

      // Upsert speakers first so we can map speaker_id to segments
      const speakerIdMap: Record<string, string> = {};
      if (speakerLabels.length > 0) {
        // Delete old for idempotency
        await supabase.from("voice_speakers").delete().eq("recording_id", recording_id);
        for (const label of speakerLabels) {
          const { data: spk } = await supabase.from("voice_speakers").insert({
            recording_id,
            speaker_label: label as string,
            speaker_role: "unknown",
          }).select("id").single();
          if (spk) speakerIdMap[label as string] = spk.id;
        }
      }

      // Upsert segments with speaker_id mapping
      if (transcription.words && savedTranscript) {
        // Delete old segments for idempotency
        await supabase.from("voice_transcript_segments").delete().eq("transcript_id", savedTranscript.id);

        let currentSpeaker = "";
        let currentText = "";
        let segStart = 0;
        let segIndex = 0;
        const segments: any[] = [];

        for (const word of transcription.words) {
          if (word.speaker !== currentSpeaker && currentText) {
            segments.push({
              transcript_id: savedTranscript.id,
              segment_index: segIndex++,
              text: currentText.trim(),
              start_ms: Math.round(segStart * 1000),
              end_ms: Math.round(word.start * 1000),
              speaker_id: speakerIdMap[currentSpeaker] || null,
              language_code: recording.language_mode || "auto",
            });
            currentText = "";
            segStart = word.start;
          }
          currentSpeaker = word.speaker || "";
          currentText += word.text + " ";
        }
        if (currentText) {
          segments.push({
            transcript_id: savedTranscript.id,
            segment_index: segIndex,
            text: currentText.trim(),
            start_ms: Math.round(segStart * 1000),
            end_ms: null,
            speaker_id: speakerIdMap[currentSpeaker] || null,
            language_code: recording.language_mode || "auto",
          });
        }
        if (segments.length > 0) await supabase.from("voice_transcript_segments").insert(segments);
      }

      // Mark success
      await supabase.from("voice_recordings").update({
        transcript_status: "completed",
        detected_languages: transcription.language_code ? [transcription.language_code] : null,
      }).eq("id", recording_id);

      if (aiRun) {
        await supabase.from("voice_ai_runs").update({
          status: "completed",
          completed_at: new Date().toISOString(),
        }).eq("id", aiRun.id);
      }

      return new Response(JSON.stringify({
        transcript_id: savedTranscript?.id,
        transcript_status: "completed",
        speaker_count: speakerLabels.length,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch (stageError) {
      console.error("Transcription stage error:", stageError);
      const errMsg = stageError instanceof Error ? stageError.message : "Transcription failed";

      if (aiRun) {
        await supabase.from("voice_ai_runs").update({
          status: "failed",
          error_message: errMsg,
          completed_at: new Date().toISOString(),
        }).eq("id", aiRun.id);
      }
      await supabase.from("voice_recordings").update({
        transcript_status: "failed",
        status: "transcript_failed_retryable",
      }).eq("id", recording_id);

      return new Response(JSON.stringify({ error: errMsg, transcript_status: "failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (error) {
    console.error("cc-run-transcription error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
