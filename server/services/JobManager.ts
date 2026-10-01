import { JobStatus } from '@/types';

export type JobStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface Job {
  id: string;
  status: JobStatus;
  progress: string;
  error?: string;
}

class JobManager {
  private jobs: Map<string, Job> = new Map();

  createJob(id: string): Job {
    const job: Job = { id, status: 'pending', progress: 'Initializing...' };
    this.jobs.set(id, job);
    return job;
  }

  updateJob(id: string, updates: Partial<Job>): void {
    const job = this.jobs.get(id);
    if (job) {
      this.jobs.set(id, { ...job, ...updates });
    }
  }

  getJob(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  deleteJob(id: string): void {
    this.jobs.delete(id);
  }
}

export const jobManager = new JobManager();
