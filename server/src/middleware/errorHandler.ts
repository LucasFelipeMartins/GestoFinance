import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { MulterError } from 'multer';
import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ message: 'Rota não encontrada.' });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    res.status(err.status).json({ message: err.message, fields: err.fields });
    return;
  }

  if (err instanceof MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? `A imagem excede o tamanho máximo de ${env.maxAvatarSizeMb}MB.`
        : 'Falha ao enviar a imagem.';
    res.status(400).json({ message });
    return;
  }

  if (err instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of err.issues) {
      const key = issue.path.join('.') || 'root';
      if (!fields[key]) fields[key] = issue.message;
    }
    res.status(400).json({ message: 'Dados inválidos.', fields });
    return;
  }

  if (err && typeof err === 'object' && 'code' in err && (err as { code: unknown }).code === 11000) {
    res.status(409).json({ message: 'Este e-mail já está cadastrado.' });
    return;
  }

  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ message: 'Erro interno do servidor.' });
}
