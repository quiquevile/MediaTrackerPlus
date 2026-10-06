const SENSITIVE_PATTERN = /password|secret|token/i;

const MASK = '***';

export const redactUrl = (url: string): string => {
  if (!url || !url.includes('?')) {
    return url;
  }

  const [path, query] = url.split('?', 2);
  const params = new URLSearchParams(query);

  for (const key of params.keys()) {
    if (SENSITIVE_PATTERN.test(key)) {
      params.set(key, MASK);
    }
  }

  return `${path}?${params.toString()}`;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const redactBody = (body: any): any => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return body;
  }

  const redacted = { ...body };

  for (const key of Object.keys(redacted)) {
    if (SENSITIVE_PATTERN.test(key)) {
      redacted[key] = MASK;
    }
  }

  return redacted;
};
