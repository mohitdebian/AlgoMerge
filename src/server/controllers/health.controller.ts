import { Request, Response } from 'express';
import { supabase } from '../utils/supabase.js';

export const getHealth = async (_req: Request, res: Response) => {
  const startedAt = Date.now();

  try {
    const { error } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (error) {
      return res.status(503).json({
        status: 'degraded',
        database: 'unavailable',
        error: error.message,
      });
    }

    return res.status(200).json({
      status: 'ok',
      database: 'connected',
      latencyMs: Date.now() - startedAt,
    });
  } catch (error) {
    return res.status(503).json({
      status: 'degraded',
      database: 'unavailable',
      error: error instanceof Error ? error.message : 'Unknown database error',
    });
  }
};
