import type { Request, Response } from 'express';
import { falha } from '../http/envelope.js';

export function notFound(req: Request, res: Response): void {
  res.status(404).json(falha(`Rota nao encontrada: ${req.method} ${req.originalUrl}`));
}
