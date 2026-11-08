import type { Express, Request, Response } from 'express';
import { request as httpRequest, type OutgoingHttpHeaders } from 'node:http';
import { request as httpsRequest } from 'node:https';

const API_PREFIX = '/api/v1';
const DEFAULT_UPSTREAM_TIMEOUT_MS = 300_000;

export function registerJavaApiProxy(
  app: Express,
  backendUrl = process.env['JAVA_API_BASE_URL'] || 'http://localhost:8080',
  timeoutMs = getUpstreamTimeout()
): void {
  const backend = new URL(backendUrl);
  if (backend.protocol !== 'http:' && backend.protocol !== 'https:') {
    throw new Error('JAVA_API_BASE_URL debe usar el protocolo HTTP o HTTPS.');
  }
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error('JAVA_API_TIMEOUT_MS debe ser un entero positivo expresado en milisegundos.');
  }

  app.use(API_PREFIX, (request: Request, response: Response) => {
    const target = new URL(request.originalUrl, backend);
    const transport = target.protocol === 'https:' ? httpsRequest : httpRequest;
    const headers: OutgoingHttpHeaders = { ...request.headers, host: target.host };
    delete headers['connection'];
    delete headers['keep-alive'];
    delete headers['proxy-authenticate'];
    delete headers['proxy-authorization'];
    delete headers['te'];
    delete headers['trailer'];
    delete headers['transfer-encoding'];
    delete headers['upgrade'];

    const upstream = transport(
      target,
      { method: request.method, headers, timeout: timeoutMs },
      (upstreamResponse) => {
        response.status(upstreamResponse.statusCode ?? 502);
        for (const [name, value] of Object.entries(upstreamResponse.headers)) {
          if (value !== undefined) response.setHeader(name, value);
        }
        upstreamResponse.pipe(response);
      }
    );

    upstream.on('timeout', () => {
      upstream.destroy(new Error('El backend clínico excedió el tiempo de respuesta.'));
    });
    upstream.on('error', (error: Error) => {
      console.error(`Falló el proxy de ${API_PREFIX} hacia ${backend.origin}:`, error.message);
      if (!response.headersSent) {
        response.status(502).json({
          message: 'No fue posible conectar con el backend clínico. Verifica que esté activo y accesible.'
        });
      } else {
        response.destroy(error);
      }
    });

    request.on('aborted', () => upstream.destroy());
    request.pipe(upstream);
  });
}

function getUpstreamTimeout(): number {
  const configuredTimeout = process.env['JAVA_API_TIMEOUT_MS'];
  if (configuredTimeout === undefined) return DEFAULT_UPSTREAM_TIMEOUT_MS;

  const timeoutMs = Number(configuredTimeout);
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error('JAVA_API_TIMEOUT_MS debe ser un entero positivo expresado en milisegundos.');
  }
  return timeoutMs;
}
