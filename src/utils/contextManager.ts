import { Project, ChatMessage, CurrentTask } from '../types';

export interface ContextBuilderOptions {
  maxHistoryMessages?: number;
}

export class ContextManager {
  /**
   * Constructs the structured prompt to be sent to the AI.
   * It combines:
   * 1. System Prompt (implicit in the way we structure this)
   * 2. Project Context (AI_CONTEXT.md)
   * 3. Session Summary (previous session)
   * 4. Task Context (current task)
   * 5. Recent Conversation History
   */
  static buildPrompt(project: Project, options: ContextBuilderOptions = {}) {
    const { maxHistoryMessages = 10 } = options;

    let prompt = '';

    // 1. Project Context
    if (project.aiContext) {
      prompt += `### PROJECT CONTEXT\n${project.aiContext}\n\n`;
    }

    // 2. Session Summary
    if (project.sessionSummary) {
      prompt += `### PREVIOUS SESSION SUMMARY\n${project.sessionSummary}\n\n`;
    }

    // 3. Task Context
    if (project.currentTask) {
      prompt += `### CURRENT TASK\n`;
      prompt += `TITLE: ${project.currentTask.title}\n`;
      prompt += `OBJECTIVE: ${project.currentTask.objective}\n`;
      prompt += `CONSTRAINTS: ${project.currentTask.constraints}\n`;
      prompt += `STATUS: ${project.currentTask.status}\n`;
      if (project.currentTask.files.length > 0) {
        prompt += `RELEVANT FILES: ${project.currentTask.files.join(', ')}\n`;
      }
      prompt += `\n`;
    }

    // 4. Conversation History (Recent only)
    const historyToUse = project.chatHistory.slice(-maxHistoryMessages);
    
    // We return the structured prompt part and the messages for the API call
    // The API expects an array of {role, content} messages.
    // We can prepend the context as a 'system' message if the API supports it,
    // or as part of the first user message. 
    // Since we are building a system-like context, let's assume we can add it as a 'system' message.
    
    return {
      systemContext: prompt,
      messages: historyToUse.map(m => ({ role: m.role, content: m.content }))
    };
  }

  /**
   * Generates a summary of the current conversation.
   * In a real implementation, this would call the AI to summarize.
   * For now, we'll define the structure and a placeholder for the AI call.
   */
  static async generateSummary(project: Project): Promise<string> {
    // This is a placeholder. In a real scenario, you would:
    // 1. Construct a special prompt: "Summarize the following conversation..."
    // 2. Call the AI API.
    // 3. Return the result.
    
    // For this implementation, we'll return a template that the AI can follow
    // when the user triggers "Compact Context".
    
    return `[SUMMARY GENERATION REQUIRED]
Please summarize the current session following this structure:

# Current Session Summary

## Objective
(What was the main goal of this session?)

## Changes Made
* (List key changes)

## Files Modified
* (List files)

## Decisions
* (List important architectural or implementation decisions)

## Problems & Solutions
* (List any significant issues encountered and how they were solved)

## Pending Tasks
* (What needs to be done next?)
`;
  }

  /**
   * Calculates the approximate context usage percentage.
   * This is a heuristic based on chat history length.
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
