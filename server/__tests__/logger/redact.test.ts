import { redactBody, redactUrl } from 'src/logger/redact';

describe('log redaction', () => {
  test('redactUrl masks token query params', () => {
    expect(redactUrl('/api/plex?token=secret123')).toEqual(
      '/api/plex?token=***'
    );
  });

  test('redactUrl keeps other params intact', () => {
    expect(redactUrl('/api/items?page=2&token=secret123')).toEqual(
      '/api/items?page=2&token=***'
    );
  });

  test('redactUrl leaves urls without query or secrets untouched', () => {
    expect(redactUrl('/api/configuration')).toEqual('/api/configuration');
    expect(redactUrl('/api/items?page=2')).toEqual('/api/items?page=2');
    expect(redactUrl(undefined)).toBeUndefined();
  });

  test('redactBody masks password-like keys without mutating', () => {
    const body = {
      username: 'admin',
      password: 'hunter2',
      confirmPassword: 'hunter2',
      nested: 'kept',
    };

    const redacted = redactBody(body);

    expect(redacted).toEqual({
      username: 'admin',
      password: '***',
      confirmPassword: '***',
      nested: 'kept',
    });
    expect(body.password).toEqual('hunter2');
  });

  test('redactBody passes through non-objects', () => {
    expect(redactBody(undefined)).toBeUndefined();
    expect(redactBody('string')).toEqual('string');
    expect(redactBody(['password'])).toEqual(['password']);
  });
});
