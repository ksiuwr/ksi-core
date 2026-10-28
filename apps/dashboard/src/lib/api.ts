export async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let result: any = {};
  if (text) {
    try {
      result = JSON.parse(text);
    } catch {
      if (!response.ok) throw new Error(`${response.status}`);
    }
  }
  if (!response.ok) throw new Error(result.code ?? result.message ?? `${response.status}`);
  return result as T;
}

export function errorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Request failed';
}
