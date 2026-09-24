import { Project, SessionSummary, FileNode } from '../types';

export interface ContextBuilderOptions {
  maxHistoryMessages?: number;
  includeFileContents?: boolean;
}

export class ContextManager {
  /**
   * Constructs the structured prompt to be sent to the AI.
   * It combines:
   * 1. PROJECT MEMORY (Long-term, architectural)
   * 2. SESSION MEMORY (Recent session summary)
   * 3. CURRENT TASK (Current objective and constraints)
   * 4. RECENT CONVERSATION (Recent chat history)
   * 5. CURRENT FILE STATE (Content of relevant files)
   * 6. SYSTEM INSTRUCTIONS (Rules and Source of Truth)
   */
  static buildPrompt(project: Project, options: ContextBuilderOptions = {}) {
    const { maxHistoryMessages = 20, includeFileContents = true } = options;

    let prompt = '';

    // 1. PROJECT MEMORY
    if (project.projectMemory) {
      prompt += `### PROJECT MEMORY\\n${project.projectMemory}\\n\\n`;
    }

    // 2. SESSION MEMORY
    if (project.currentSessionSummary) {
      prompt += `### SESSION MEMORY\\n${project.currentSessionSummary.content}\\n\\n`;
    }

    // 3. CURRENT TASK
    if (project.currentTask) {
      prompt += `### CURRENT TASK\\n`;
      prompt += `TITLE: ${project.currentTask.title}\\n`;
      prompt += `OBJECTIVE: ${project.currentTask.objective}\\n`;
      prompt += `CONSTRAINTS: ${project.currentTask.constraints}\\n`;
      prompt += `STATUS: ${project.currentTask.status}\\n`;
      if (project.currentTask.files.length > 0) {
        prompt += `RELEVANT FILES: ${project.currentTask.files.join(', ')}\\n`;
      }
      prompt += `\\n`;
    }

    // 4. CURRENT FILE STATE
    if (includeFileContents) {
      const relevantFiles = this.getRelevantFiles(project);
      if (relevantFiles.length > 0) {
        prompt += `### CURRENT FILE STATE\\n`;
        relevantFiles.forEach(file => {
          prompt += `--- File: ${file.name} ---\\n`;
          prompt += `${file.content || '[No content available]'}\\n\\n`;
        });
      }
    }

    // 5. RECENT CONVERSATION
    const historyToUse = project.chatHistory.slice(-maxHistoryMessages);
    if (historyToUse.length > 0) {
      prompt += `### RECENT CONVERSATION\\n`;
      historyToUse.forEach(m => {
        prompt += `${m.role.toUpperCase()}: ${m.content}\\n`;
      });
      prompt += `\\n`;
    }

    // 6. SYSTEM INSTRUCTIONS (The Rules)
    prompt += `### INSTRUCTIONS\\n`;
    prompt += `1. SOURCE OF TRUTH: The current state of the files in the project is the absolute source of truth. If there is any conflict between memories (Project or Session) and the current code, the current code MUST prevail.\\n`;
    prompt += `2. USE CURRENT CONTENT: When performing tasks, always work with the most recent content of the files. Do not rely on code snippets found in the conversation history unless they are explicitly being proposed as changes.\\n`;
    prompt += `3. ARCHITECTURE: Respect the established project architecture and patterns found in PROJECT MEMORY.\\n`;
    prompt += `4. TASK FOCUS: Stay focused on the CURRENT TASK and its objectives.\\n`;
    prompt += `\\n`;
    prompt += `### FILE GENERATION & UPDATES\\n`;
    prompt += `When the task asks to create or modify files, the model must generate the files directly.\\n`;
    prompt += `Each file MUST be preceded exactly by:\\n\\n`;
    prompt += `FILE: path/to/file.ext\\n\\n`;
    prompt += `followed immediately by a Markdown code block containing the content of that file.\\n\\n`;
    prompt += `Valid examples:\\n\\n`;
    prompt += `FILE: package.json\\n\\n\`\`\`json\\n[JSON content]\\n\`\`\`\\n\\n`;
    prompt += `FILE: src/main.jsx\\n\\n\`\`\`jsx\\n[Code content]\\n\`\`\`\\n\\n`;
    prompt += `FILE: src/App.jsx\\n\\n\`\`\`jsx\\n[Code content]\\n\`\`\`\\n\\n`;
    prompt += `\\n`;
    prompt += `The path specified in FILE: must be the real path within the project.\\n`;
    prompt += `It is mandatory to provide package.json when creating a project that requires it.\\n`;
    prompt += `It is mandatory to provide all files necessary for the project to function.\\n`;
    prompt += `DO NOT invent filenames.\\n`;
    prompt += `DO NOT use README.md as a substitute for other files' code.\\n`;
    prompt += `DO NOT put code from multiple files inside a single block.\\n`;
    prompt += `DO NOT provide code without a corresponding FILE:.\\n`;
    prompt += `DO NOT respond with tutorials.\\n`;
    prompt += `DO NOT provide terminal commands like npm install, npm run dev, npm create vite, etc., when creating project files.\\n`;
    prompt += `DO NOT tell the user to copy and paste files manually.\\n`;
    prompt += `DO NOT explain step-by-step how to configure the project.\\n`;
    prompt += `The response will be automatically processed by BuilderAI. Therefore, when the task involves creating or changing files, the priority is to directly produce the necessary files.\\n`;
    prompt += `Short explanatory text can be used only when truly necessary, but it must never replace file generation.\\n`;
    prompt += `Preserve existing files when the task is an update. Modify only what is necessary to fulfill the task.\\n`;
    prompt += `Respect the existing project structure and technologies.\\n`;
    prompt += `For a project creation task, generate a complete and executable structure, not just partial examples.\\n`;

    return {
      systemContext: prompt,
      messages: historyToUse.map(m => ({ role: m.role, content: m.content }))
    };
  }

  /**
   * Helper to extract relevant file contents.
   * Prioritizes files mentioned in the current task.
   */
  private static getRelevantFiles(project: Project): FileNode[] {
    const relevantFileNames = project.currentTask?.files || [];
    
    if (relevantFileNames.length === 0) {
      // If no task-specific files, return all files that have content
      return this.flattenFiles(project.files).filter(f => f.content);
    }

    // Find the actual FileNodes by name
    const allFiles = this.flattenFiles(project.files);
    return allFiles.filter(f => relevantFileNames.includes(f.name) && f.content);
  }

  /**
   * Flattens the file tree into a single array.
   */
  private static flattenFiles(nodes: FileNode[]): FileNode[] {
    let flat: FileNode[] = [];
    for (const node of nodes) {
      flat.push(node);
      if (node.children) {
        flat = [...flat, ...this.flattenFiles(node.children)];
      }
    }
    return flat;
  }

  /**
   * Generates a prompt for the AI to summarize the session.
   * This template is designed to help the AI distinguish between permanent and transient information.
   */
  static async generateSummaryPrompt(project: Project): Promise<string> {
    const taskTitle = project.currentTask?.title || 'Unknown Task';
    const filesModified = project.currentTask?.files?.join(', ') || 'Unknown';

    return `Please generate a structured session summary for the current task: \"${taskTitle}\".\\n\\nYour summary should be divided into two distinct sections to help maintain context for future sessions.\\n\\n---\\n\\n# SESSION SUMMARY\\n\\n## 1. SESSION MEMORY (Transient Information)\\n*This section is for things specific to this session that might not be relevant forever.*\\n- **Objective**: What was the main goal of this specific session?\\n- **Changes Made**: List the key changes and modifications.\\n- **Files Modified**: ${filesModified}\\n- **Current Progress**: What was actually achieved?\\n- **Unresolved Issues**: Are there any bugs, half-finished features, or problems encountered?\\n- **Next Steps**: What are the immediate next actions for the next session?\\n\\n## 2. PROJECT MEMORY (Permanent Knowledge)\\n*This section is for information that MUST survive between sessions and shape the project's long-term evolution. Only include high-level, foundational information here.*\\n- **Architectural Decisions**: Any new patterns, structures, or library choices made.\\n- **Core Rules**: Any new coding standards or constraints discovered or established.\\n- **Key Functionalities**: Important features that define how the system works.\\n- **Project Structure**: Any significant changes to the project layout.\\n\\n---\\n\\n**IMPORTANT**: Be concise. Avoid re-stating obvious things. Focus on the \"WHY\" and \"HOW\" for Project Memory, and the \"WHAT\" and \"NEXT\" for Session Memory.\\n`;
  }

  /**
   * Calculates the approximate context usage percentage.
   */
  static calculateContextUsage(project: Project): number {
    const MAX_MESSAGES = 50;
    const usage = (project.chatHistory.length / MAX_MESSAGES) * 100;
    return Math.min(Math.round(usage), 100);
  }

  static getContextStatus(usage: number): { label: string; color: string } {
    if (usage < 50) return { label: 'Normal', color: 'text-green-500' };
    if (usage < 80) return { label: 'High', color: 'text-amber-500' };
    return { label: 'Critical', color: 'text-red-500' };
  }
}
