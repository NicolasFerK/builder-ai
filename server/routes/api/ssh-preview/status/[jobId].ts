import { defineHandler } from "nitro";
import { createError } from "nitro/h3";
import { jobManager } from "../../../../services/JobManager";

export default defineHandler(async (event) => {
  const jobId = event.context.params?.jobId;

  if (!jobId) {
    throw createError({
      statusCode: 400,
      statusMessage: "jobId is required",
    });
  }

  const job = jobManager.getJob(jobId);
  if (!job) {
    throw createError({
      statusCode: 404,
      statusMessage: "Job not found",
    });
  }

  return job;
});
