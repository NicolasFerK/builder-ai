import { defineHandler } from "nitro";
import { createError } from "nitro/h3";
import { configService } from "../../services/ConfigService";
import { SSHPreviewService } from "../../services/SSHPreviewService";
import { jobManager } from "../../services/JobManager";
import path from "path";

export default defineHandler(async (event) => {
  const body = await import("nitro/h3").then(h3 => h3.readBody(event));
  const { projectId } = body;

  if (!projectId) {
    throw createError({
      statusCode: 400,
      statusMessage: "projectId is required",
    });
  }

  const settings = await configService.getAISettings();
  const sshConfig = settings.sshConfig;

  if (!sshConfig || !sshConfig.host || !sshConfig.user) {
    throw createError({
      statusCode: 400,
      statusMessage: "SSH configuration is incomplete. Please configure host and user in Settings.",
    });
  }

  const projectsRoot = path.join(process.cwd(), "projects");
  const projectDir = path.join(projectsRoot, projectId);

  try {
    await import("fs/promises").then(fs => fs.access(projectDir));
  } catch (err) {
    throw createError({
      statusCode: 404,
      statusMessage: `Project ${projectId} not found on server.`,
    });
  }

  const jobId = Math.random().toString(36).substring(7);
  jobManager.createJob(jobId);

  const sshService = new SSHPreviewService({
    projectId,
    config: sshConfig,
    projectRoot: projectDir,
    jobId,
  });

  // Run in background
  sshService.run(async (status) => {
      console.log(`[SSH-PREVIEW] Project ${projectId} (${jobId}): ${status}`);
  }).catch(err => {
      console.error(`[SSH-PREVIEW] Job ${jobId} failed:`, err);
  });

  return { jobId };
});
