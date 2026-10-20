/**
 * AgentGuard REST API Routes
 * Implements /v1/* endpoints according to specification.
 */

import { Request, Response, Router } from 'express';
import { evaluateAction } from './engine/evaluator.js';
import {
  getActivePolicy,
  getActivePolicyYaml,
  resetToDefaultPolicy,
  updateActivePolicy,
  validatePolicy,
} from './engine/policyEngine.js';
import { runSimulationSuite } from './engine/simulationSuite.js';
import {
  decideApproval,
  getApproval,
  listApprovals,
  subscribeEvents,
} from './store/approvalStore.js';
import { getSystemMetrics, queryAudit, verifyHashChain } from './store/auditStore.js';

export const apiRouter = Router();

// Middleware: Basic request logging & error handling
apiRouter.use((req, res, next) => {
  res.setHeader('X-AgentGuard-Engine', 'v3-fast-llm');
  next();
});

/**
 * 5.2 POST /v1/evaluate
 */
apiRouter.post('/evaluate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { tool, action } = req.body;
    if (!tool || !action) {
      res.status(422).json({
        error: {
          code: 'validation_error',
          message: 'Fields "tool" and "action" are required.',
        },
      });
      return;
    }

    const result = await evaluateAction(req.body);
    // As per spec: A verdict is always returned with HTTP 200. BLOCK is a normal answer, not an error.
    res.status(200).json(result);
  } catch (err: any) {
    res.status(500).json({
      error: {
        code: 'evaluation_error',
        message: err.message || 'Internal evaluation error',
      },
    });
  }
});

/**
 * 5.3 Approvals API
 */
// GET /v1/approvals
apiRouter.get('/approvals', (req: Request, res: Response) => {
  const statusFilter = req.query.status as string | undefined;
  const approvals = listApprovals(statusFilter);
  res.json({
    approvals,
    total: approvals.length,
  });
});

// GET /v1/approvals/:id
apiRouter.get('/approvals/:id', (req: Request, res: Response): void => {
  const approval = getApproval(req.params.id);
  if (!approval) {
    res.status(404).json({
      error: {
        code: 'not_found',
        message: `Approval record ${req.params.id} does not exist.`,
      },
    });
    return;
  }
  res.json(approval);
});

// POST /v1/approvals/:id/decision
apiRouter.post('/approvals/:id/decision', (req: Request, res: Response): void => {
  const { decision, reason, decided_by } = req.body;
  if (!decision || !['approve', 'deny'].includes(decision)) {
    res.status(422).json({
      error: {
        code: 'validation_error',
        message: 'Field "decision" must be either "approve" or "deny".',
      },
    });
    return;
  }

  const result = decideApproval(
    req.params.id,
    decision as 'approve' | 'deny',
    reason,
    decided_by || 'admin_operator'
  );

  if (!result.success) {
    res.status(result.status || 400).json({
      error: {
        code: result.status === 409 ? 'already_decided' : 'decision_failed',
        message: result.error,
      },
    });
    return;
  }

  res.json({
    success: true,
    approval: result.record,
  });
});

/**
 * 5.5 Policies API
 */
// GET /v1/policies/active
apiRouter.get('/policies/active', (_req: Request, res: Response) => {
  res.json({
    policy: getActivePolicy(),
    yaml: getActivePolicyYaml(),
  });
});

// PUT /v1/policies
apiRouter.put('/policies', (req: Request, res: Response): void => {
  const { yaml, json } = req.body;
  const content = yaml || (json ? JSON.stringify(json) : null);
  if (!content) {
    res.status(422).json({
      error: {
        code: 'validation_error',
        message: 'Must provide either "yaml" or "json" string body.',
      },
    });
    return;
  }

  const updateResult = updateActivePolicy(content);
  if (!updateResult.success) {
    res.status(422).json({
      error: {
        code: 'policy_validation_failed',
        message: updateResult.error,
      },
    });
    return;
  }

  res.json({
    success: true,
    version: updateResult.version,
    policy: updateResult.policy,
  });
});

// POST /v1/policies/validate
apiRouter.post('/policies/validate', (req: Request, res: Response): void => {
  const { yaml, json } = req.body;
  const content = yaml || (json ? JSON.stringify(json) : null);
  if (!content) {
    res.status(422).json({
      error: {
        code: 'validation_error',
        message: 'Must provide either "yaml" or "json" string body.',
      },
    });
    return;
  }

  const result = validatePolicy(content);
  res.json(result);
});

// POST /v1/policies/reset
apiRouter.post('/policies/reset', (_req: Request, res: Response) => {
  const resetPolicy = resetToDefaultPolicy();
  res.json({
    success: true,
    policy: resetPolicy,
    yaml: getActivePolicyYaml(),
  });
});

/**
 * 5.6 Audit & Metrics API
 */
// GET /v1/audit
apiRouter.get('/audit', (req: Request, res: Response) => {
  const { verdict, agent_id, session_id, limit } = req.query;
  const records = queryAudit({
    verdict: verdict as any,
    agent_id: agent_id as string,
    session_id: session_id as string,
    limit: limit ? parseInt(limit as string, 10) : 100,
  });

  res.json({
    records,
    count: records.length,
  });
});

// GET /v1/audit/verify
apiRouter.get('/audit/verify', (_req: Request, res: Response) => {
  const verification = verifyHashChain();
  res.json(verification);
});

// GET /v1/metrics
apiRouter.get('/metrics', (_req: Request, res: Response) => {
  res.json(getSystemMetrics());
});

// GET /v1/health
apiRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    llm_reachable: Boolean(process.env.GEMINI_API_KEY),
    version: '3.0.0',
    mode: 'dual-fast-deep',
  });
});

/**
 * 5.7 POST /v1/simulate
 */
apiRouter.post('/simulate', async (_req: Request, res: Response): Promise<void> => {
  try {
    const report = await runSimulationSuite();
    res.json(report);
  } catch (err: any) {
    res.status(500).json({
      error: {
        code: 'simulation_error',
        message: err.message,
      },
    });
  }
});

/**
 * 5.4 Server-Sent Events stream for live real-time feeds
 * GET /v1/events
 */
apiRouter.get('/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Send initial ping
  res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', ts: Date.now() })}\n\n`);

  const unsubscribe = subscribeEvents((event) => {
    res.write(`event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`);
  });

  req.on('close', () => {
    unsubscribe();
  });
});

/**
 * OpenAPI 3.1 Specification JSON
 * GET /v1/openapi.json
 */
apiRouter.get('/openapi.json', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'AgentGuard API',
      version: '3.0.0',
      description:
        'Permission and Policy API for Autonomous AI Agents · DevHack 2026 PS 2.1\nEvaluates agent tool actions and issues ALLOW, ASK_HUMAN, or BLOCK verdicts.',
    },
    servers: [{ url: '/v1' }],
    paths: {
      '/evaluate': {
        post: {
          summary: 'Evaluate Proposed Agent Action',
          description:
            'Intercepts an agent tool call, sanitizes sensitive data via Privacy Shield, runs risk rules, and yields an enforcement verdict.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['tool', 'action'],
                  properties: {
                    agent_id: { type: 'string', example: 'agent_coder_01' },
                    session_id: { type: 'string', example: 'session_7f8a9' },
                    tool: {
                      type: 'string',
                      enum: ['shell', 'filesystem', 'http', 'database', 'package'],
                    },
                    action: {
                      type: 'string',
                      enum: ['execute', 'read', 'write', 'delete', 'send', 'install', 'query'],
                    },
                    command: { type: 'string', example: 'ls -la' },
                    target: { type: 'string', example: '/sandbox/workspace' },
                    payload: { type: 'string' },
                    mode: { type: 'string', enum: ['fast', 'deep'], default: 'fast' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Evaluation result with verdict',
            },
          },
        },
      },
      '/approvals': {
        get: {
          summary: 'List Pending / Historical Approvals',
          parameters: [
            {
              name: 'status',
              in: 'query',
              schema: { type: 'string', enum: ['pending', 'approved', 'denied', 'expired'] },
            },
          ],
        },
      },
      '/approvals/{id}/decision': {
        post: {
          summary: 'Submit Human Decision (Approve / Deny)',
        },
      },
      '/simulate': {
        post: {
          summary: 'Run 15-Scenario Benchmark Suite',
        },
      },
      '/audit/verify': {
        get: {
          summary: 'Verify Cryptographic Hash-Chain Integrity',
        },
      },
      '/metrics': {
        get: {
          summary: 'Get Live Latency and Interception Metrics',
        },
      },
    },
  });
});
