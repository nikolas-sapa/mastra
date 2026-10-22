import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod/v4';
import { Mastra } from '../mastra';
import { MockStore } from '../storage/mock';
import { createWorkflow } from './create';
import { createStep } from './workflow';

describe('parallel workflow restart on non-first branch', () => {
  it('re-executes active branch at index > 0 during workflow restart', async () => {
    const storage = new MockStore();
    const mastra = new Mastra({ logger: false, storage });

    const mockStepA = vi.fn().mockResolvedValue({ a: 1 });
    const mockStepB = vi.fn().mockResolvedValue({ b: 2 });
    const mockStepC = vi.fn().mockResolvedValue({ c: 3 });

    const inputSchema = z.object({ value: z.string() });

    const stepA = createStep({
      id: 'stepA',
      execute: mockStepA,
      inputSchema,
      outputSchema: z.object({ a: z.number() }),
    });

    const stepB = createStep({
      id: 'stepB',
      execute: mockStepB,
      inputSchema,
      outputSchema: z.object({ b: z.number() }),
    });

    const stepC = createStep({
      id: 'stepC',
      execute: mockStepC,
      inputSchema,
      outputSchema: z.object({ c: z.number() }),
    });

    const workflow = createWorkflow({
      id: 'parallelBranchRestartTest',
      inputSchema,
      outputSchema: z.any(),
    })
      .parallel([stepA, stepB, stepC])
      .commit();

    workflow.__registerMastra(mastra);

    const workflowsStore = await storage?.getStore('workflows');
    const runId = `test-parallel-restart-${Date.now()}`;

    // Simulate snapshot where stepA and stepC previously completed, but stepB was running and crashed
    await workflowsStore!.persistWorkflowSnapshot({
      workflowName: workflow.id,
      runId,
      snapshot: {
        runId,
        status: 'running',
        activePaths: [0],
        activeStepsPath: { stepB: [0, 1] },
        value: {},
        context: {
          input: { value: 'test' },
          stepA: {
            payload: { value: 'test' },
            startedAt: Date.now() - 1000,
            status: 'success',
            output: { a: 1 },
            endedAt: Date.now() - 500,
          },
          stepB: {
            payload: { value: 'test' },
            startedAt: Date.now() - 500,
            status: 'running',
          },
          stepC: {
            payload: { value: 'test' },
            startedAt: Date.now() - 1000,
            status: 'success',
            output: { c: 3 },
            endedAt: Date.now() - 500,
          },
        },
        serializedStepGraph: (workflow as any).serializedStepGraph,
        suspendedPaths: {},
        waitingPaths: {},
        resumeLabels: {},
        timestamp: Date.now(),
      },
    });

    const run = await workflow.createRun({ runId });
    const restartResult = await run.restart();

    // stepB must have been re-executed on restart
    expect(mockStepB).toHaveBeenCalledTimes(1);
    expect(restartResult.status).toBe('success');
    expect(restartResult.steps.stepB.status).toBe('success');
    expect(restartResult.steps.stepB.output).toEqual({ b: 2 });
  });

  it('re-executes non-first parallel branch during time-travel', async () => {
    const storage = new MockStore();
    const mastra = new Mastra({ logger: false, storage });

    const mockStepA = vi.fn().mockResolvedValue({ a: 1 });
    const mockStepB = vi.fn().mockResolvedValue({ b: 20 }); // returns updated value on time-travel
    const mockStepC = vi.fn().mockResolvedValue({ c: 3 });

    const inputSchema = z.object({ value: z.string() });

    const stepA = createStep({
      id: 'stepA',
      execute: mockStepA,
      inputSchema,
      outputSchema: z.object({ a: z.number() }),
    });

    const stepB = createStep({
      id: 'stepB',
      execute: mockStepB,
      inputSchema,
      outputSchema: z.object({ b: z.number() }),
    });

    const stepC = createStep({
      id: 'stepC',
      execute: mockStepC,
      inputSchema,
      outputSchema: z.object({ c: z.number() }),
    });

    const workflow = createWorkflow({
      id: 'parallelTimeTravelTest',
      inputSchema,
      outputSchema: z.any(),
    })
      .parallel([stepA, stepB, stepC])
      .commit();

    workflow.__registerMastra(mastra);

    const workflowsStore = await storage?.getStore('workflows');
    const runId = `test-parallel-timetravel-${Date.now()}`;

    // Completed workflow run where all 3 steps succeeded
    await workflowsStore!.persistWorkflowSnapshot({
      workflowName: workflow.id,
      runId,
      snapshot: {
        runId,
        status: 'success',
        result: { a: 1, b: 2, c: 3 },
        activePaths: [0],
        activeStepsPath: {},
        value: {},
        context: {
          input: { value: 'initial' },
          stepA: {
            payload: { value: 'initial' },
            startedAt: 1000,
            status: 'success',
            output: { a: 1 },
            endedAt: 1100,
          },
          stepB: {
            payload: { value: 'initial' },
            startedAt: 1000,
            status: 'success',
            output: { b: 2 },
            endedAt: 1100,
          },
          stepC: {
            payload: { value: 'initial' },
            startedAt: 1000,
            status: 'success',
            output: { c: 3 },
            endedAt: 1100,
          },
        },
        serializedStepGraph: (workflow as any).serializedStepGraph,
        suspendedPaths: {},
        waitingPaths: {},
        resumeLabels: {},
        timestamp: Date.now(),
      },
    });

    const run = await workflow.createRun({ runId });
    // Time travel to stepB (branch index 1)
    const timeTravelResult = await run.timeTravel({
      step: stepB,
      inputData: { value: 're-run' },
    });

    // stepB must have been re-executed with updated output
    expect(mockStepB).toHaveBeenCalledTimes(1);
    expect(timeTravelResult.status).toBe('success');
    expect(timeTravelResult.steps.stepB.output).toEqual({ b: 20 });
  });
});
