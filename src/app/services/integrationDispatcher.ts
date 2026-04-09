import { DomainEvent, IntegrationConfig, IntegrationLog } from '../types';

function buildHeaders(config: IntegrationConfig) {
  const headers = new Headers(config.headersJson || {});

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (config.authType === 'bearer' && config.authConfigJson?.token) {
    headers.set('Authorization', `Bearer ${config.authConfigJson.token}`);
  }

  if (
    config.authType === 'basic' &&
    config.authConfigJson?.username &&
    config.authConfigJson?.password
  ) {
    const encoded = btoa(`${config.authConfigJson.username}:${config.authConfigJson.password}`);
    headers.set('Authorization', `Basic ${encoded}`);
  }

  if (
    config.authType === 'header' &&
    config.authConfigJson?.headerName &&
    config.authConfigJson?.headerValue
  ) {
    headers.set(config.authConfigJson.headerName, config.authConfigJson.headerValue);
  }

  return headers;
}

function createLog(
  config: IntegrationConfig,
  event: DomainEvent,
  attempt: number,
  status: IntegrationLog['status'],
  extras?: Partial<IntegrationLog>
): IntegrationLog {
  return {
    id: `integration-log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    integrationId: config.id,
    eventName: event.name,
    payloadJson: event.payloadJson,
    status,
    attempt,
    createdAt: new Date().toISOString(),
    ...extras,
  };
}

export async function dispatchIntegrationEvent(
  config: IntegrationConfig,
  event: DomainEvent
): Promise<IntegrationLog[]> {
  const retryCount = Math.max(0, config.retryCount || 0);
  const timeoutMs = Math.max(1000, config.timeoutMs || 8000);
  const logs: IntegrationLog[] = [];

  if (!config.isActive) {
    return [createLog(config, event, 1, 'skipped', { responseBody: 'Integração inativa.' })];
  }

  if (!config.subscribedEvents.includes(event.name)) {
    return [createLog(config, event, 1, 'skipped', { responseBody: 'Evento não inscrito.' })];
  }

  if (config.type === 'internal') {
    return [createLog(config, event, 1, 'success', { responseBody: 'Evento interno registrado.' })];
  }

  if (!config.endpoint) {
    return [createLog(config, event, 1, 'error', { responseBody: 'Endpoint não configurado.' })];
  }

  for (let attempt = 1; attempt <= retryCount + 1; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(config.endpoint, {
        method: config.method || 'POST',
        headers: buildHeaders(config),
        body:
          config.method === 'GET'
            ? undefined
            : JSON.stringify({
                event,
                integration: {
                  id: config.id,
                  name: config.name,
                  type: config.type,
                },
              }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      const responseBody = await response.text();
      const log = createLog(
        config,
        event,
        attempt,
        response.ok ? 'success' : 'error',
        {
          statusCode: response.status,
          responseBody,
        }
      );
      logs.push(log);

      if (response.ok) {
        break;
      }
    } catch (error) {
      clearTimeout(timer);
      logs.push(
        createLog(config, event, attempt, 'error', {
          responseBody: error instanceof Error ? error.message : 'Falha desconhecida ao enviar webhook.',
        })
      );
    }
  }

  return logs;
}
