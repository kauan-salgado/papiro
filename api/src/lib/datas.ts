import { z } from 'zod';

/** Data no formato do formulario HTML: YYYY-MM-DD. */
export const dataISOSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato YYYY-MM-DD.');

/**
 * Converte YYYY-MM-DD para Date ancorado ao MEIO-DIA UTC.
 *
 * Colunas DATE no Postgres recebem um timestamp e o convertem usando o fuso da
 * sessao. Meia-noite UTC vira o dia anterior em qualquer fuso negativo (o
 * Brasil inteiro) — o classico erro de um dia. Meio-dia UTC cai no mesmo dia do
 * calendario em qualquer fuso entre -11 e +11.
 */
export function paraDataDoBanco(iso: string): Date {
  const [ano, mes, dia] = iso.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(ano, mes - 1, dia, 12, 0, 0));
}

/** Volta de Date para YYYY-MM-DD, sem deixar o fuso local mexer no dia. */
export function formatarDataISO(data: Date): string {
  return data.toISOString().slice(0, 10);
}
