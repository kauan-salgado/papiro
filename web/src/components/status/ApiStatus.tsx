import { useEffect, useState } from 'react';
import './api-status.css';

type Estado = 'carregando' | 'online' | 'offline';

type HealthPayload = {
  readonly status: string;
  readonly service: string;
  readonly uptimeSegundos: number;
};

/**
 * Sonda de infraestrutura: confirma que o front fala com a API que fala com o banco.
 * Serve de prova viva de que o docker-compose subiu inteiro.
 */
export function ApiStatus() {
  const [estado, setEstado] = useState<Estado>('carregando');
  const [detalhe, setDetalhe] = useState<HealthPayload | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function sondar() {
      try {
        const resposta = await fetch('/api/health', { signal: controller.signal });

        if (!resposta.ok) {
          throw new Error(`API respondeu ${resposta.status}`);
        }

        const corpo: { data: HealthPayload } = await resposta.json();
        setDetalhe(corpo.data);
        setEstado('online');
      } catch (erro) {
        if (controller.signal.aborted) {
          return;
        }
        console.error('[web] falha ao consultar /api/health:', erro);
        setEstado('offline');
      }
    }

    void sondar();
    return () => controller.abort();
  }, []);

  return (
    <aside className="api-status" data-estado={estado} aria-live="polite">
      <span className="api-status__marcador" aria-hidden="true" />
      <div>
        <p className="api-status__titulo">
          {estado === 'carregando' && 'Consultando a API…'}
          {estado === 'online' && 'API conectada'}
          {estado === 'offline' && 'API fora do ar'}
        </p>
        <p className="api-status__detalhe">
          {estado === 'online' && detalhe
            ? `${detalhe.service} · no ar há ${detalhe.uptimeSegundos}s`
            : 'docker compose up -d'}
        </p>
      </div>
    </aside>
  );
}
