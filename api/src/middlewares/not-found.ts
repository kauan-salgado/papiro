import type { Request, Response } from 'express';

export function notFound(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    data: null,
    error: `Rota nao encontrada: ${req.method} ${req.originalUrl}`,
  });
}
