import { Readable } from 'stream';
import { Request } from 'express';

import {
  describePlexPayload,
  getPlexPayload,
  isPlexAccountAllowed,
  PlexPayload,
} from 'src/controllers/plexController';

const scrobblePayload: PlexPayload = {
  event: 'media.scrobble',
  Account: { title: 'quique' },
  Player: { title: 'Living Room TV' },
  Metadata: {
    type: 'episode',
    grandparentTitle: 'Loki',
    parentIndex: 1,
    index: 2,
    title: 'The Variant',
    duration: 3120000,
    Guid: [
      { id: 'imdb://tt9140554' },
      { id: 'tmdb://84958' },
      { id: 'tvdb://338600' },
    ],
  },
};

const toMultipartBody = (payload: unknown): { body: string; boundary: string } => {
  const boundary = 'testboundary123';
  const body =
    `--${boundary}\r\n` +
    'Content-Disposition: form-data; name="payload"\r\n\r\n' +
    `${JSON.stringify(payload)}\r\n` +
    `--${boundary}--\r\n`;

  return { body, boundary };
};

const toMockRequest = (body: string, boundary: string): Request => {
  const stream = Readable.from([body]) as Readable & {
    headers: Record<string, string>;
  };
  stream.headers = {
    'content-type': `multipart/form-data; boundary=${boundary}`,
  };

  return stream as unknown as Request;
};

describe('plex webhook', () => {
  test('parses multipart payload', async () => {
    const { body, boundary } = toMultipartBody(scrobblePayload);

    const payload = await getPlexPayload(toMockRequest(body, boundary));

    expect(payload.event).toEqual('media.scrobble');
    expect(payload.Metadata.title).toEqual('The Variant');
  });

  test('rejects bodies without payload field', async () => {
    const boundary = 'testboundary123';
    const body =
      `--${boundary}\r\n` +
      'Content-Disposition: form-data; name="other"\r\n\r\n' +
      `value\r\n` +
      `--${boundary}--\r\n`;

    await expect(getPlexPayload(toMockRequest(body, boundary))).rejects.toThrow(
      /payload/
    );
  });

  test('describes episode deliveries', () => {
    expect(describePlexPayload(scrobblePayload, 1)).toEqual(
      'event=media.scrobble type=episode title="Loki S1E2 The Variant" ' +
        'account="quique" player="Living Room TV" ' +
        'ids=[imdb:tt9140554, tmdb:84958, tvdb:338600] user=1'
    );
  });

  test('describes minimal movie deliveries', () => {
    expect(
      describePlexPayload(
        {
          event: 'media.play',
          Metadata: {
            type: 'movie',
            title: 'Dune',
            duration: 9300000,
            Guid: [{ id: 'tmdb://438631' }],
          },
        },
        2
      )
    ).toEqual('event=media.play type=movie title="Dune" ids=[tmdb:438631] user=2');
  });

  test('describes payloads without Guids', () => {
    expect(
      describePlexPayload(
        {
          event: 'media.stop',
          Metadata: {
            type: 'movie',
            duration: 1000,
            Guid: [],
          },
        },
        1
      )
    ).toEqual('event=media.stop type=movie user=1');
  });
});

describe('plex account filter', () => {
  test('allows everything by default', () => {
    expect(isPlexAccountAllowed('Niños', [], [])).toEqual(true);
    expect(isPlexAccountAllowed(undefined, [], [])).toEqual(true);
  });

  test('allow list restricts to listed accounts', () => {
    expect(isPlexAccountAllowed('miperfil', ['miperfil'], [])).toEqual(true);
    expect(isPlexAccountAllowed('Niños', ['miperfil'], [])).toEqual(false);
    expect(isPlexAccountAllowed(undefined, ['miperfil'], [])).toEqual(false);
  });

  test('matching is case-insensitive and trims whitespace', () => {
    expect(isPlexAccountAllowed('  MIPERFIL ', ['miperfil'], [])).toEqual(
      true
    );
    expect(isPlexAccountAllowed('niños', [], [' Niños '])).toEqual(false);
  });

  test('deny list wins over allow list', () => {
    expect(isPlexAccountAllowed('Niños', ['Niños'], ['Niños'])).toEqual(false);
    expect(isPlexAccountAllowed('miperfil', ['miperfil'], [])).toEqual(true);
  });
});
