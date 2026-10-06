import busboy from 'busboy';
import { Request } from 'express';
import { logger } from 'src/logger';
import { Config } from 'src/config';
import {
  findEpisodeByExternalId,
  findMediaItemByExternalId,
} from 'src/metadata/findByExternalId';
import { seenRepository } from 'src/repository/seen';
import { createExpressRoute } from 'typescript-routes-to-openapi-server';

/**
 * @openapi_tags Lists
 */
export class PlexController {
  /**
   * @openapi_operationId Plex webhook
   */
  post = createExpressRoute<{
    method: 'post';
    path: '/api/plex';
  }>(async (req, res) => {
    const userId = Number(req.user);

    const payload = await getPlexPayload(req);

    if (!payload?.Metadata) {
      logger.warn(`Plex webhook: delivery without Metadata, user ${userId}`);
      res.sendStatus(200);
      return;
    }

    logger.debug(
      `Plex webhook delivery: ${describePlexPayload(payload, userId)}`
    );

    if (Config.PLEX_WEBHOOK_DEBUG) {
      logger.debug(`Plex webhook payload: ${JSON.stringify(payload)}`);
    }

    if (
      !isPlexAccountAllowed(
        payload.Account?.title,
        Config.PLEX_ALLOWED_ACCOUNTS,
        Config.PLEX_DENIED_ACCOUNTS
      )
    ) {
      logger.debug(
        `Plex webhook: dropping delivery from account "${payload.Account?.title}" (account filter)`
      );
      res.sendStatus(200);
      return;
    }

    if (payload.event === 'media.scrobble') {
      const { imdbId, tmdbId, tvdbId, duration } = parsePlexPayload(payload);

      if (payload.Metadata.type === 'episode') {
        const { mediaItem, episode } = await findEpisodeByExternalId({
          imdbId,
          tmdbId,
          tvdbId,
        });

        if (episode) {
          logger.debug(
            `adding episode ${mediaItem.title} ${episode.seasonNumber}x${episode.episodeNumber} to seen history of user ${userId} with Plex webhook`
          );
          await seenRepository.create({
            userId: userId,
            mediaItemId: mediaItem.id,
            episodeId: episode.id,
            date: Date.now(),
            duration: duration || episode.runtime,
          });
        } else {
          logger.warn(
            `Plex webhook: no library match for scrobbled episode (imdbId=${imdbId}, tmdbId=${tmdbId}, tvdbId=${tvdbId}), user ${userId}`
          );
        }
      } else if (payload.Metadata.type === 'movie') {
        const mediaItem = await findMediaItemByExternalId({
          id: {
            imdbId,
            tmdbId,
            tvdbId,
          },
          mediaType: 'movie',
        });

        if (mediaItem) {
          logger.debug(
            `adding movie ${mediaItem.title} to seen history of user ${userId} with Plex webhook`
          );
          await seenRepository.create({
            userId: userId,
            mediaItemId: mediaItem.id,
            date: Date.now(),
            duration: duration || mediaItem.runtime,
          });
        } else {
          logger.warn(
            `Plex webhook: no library match for scrobbled movie (imdbId=${imdbId}, tmdbId=${tmdbId}, tvdbId=${tvdbId}), user ${userId}`
          );
        }
      }
    } else {
      logger.debug(`Plex webhook: ignoring event ${payload.event}`);
    }

    res.sendStatus(200);
  });
}

export type PlexPayload = {  event:
    | 'media.resume'
    | 'media.pause'
    | 'media.play'
    | 'media.rate'
    | 'media.scrobble'
    | 'media.stop';
  Account?: {
    title?: string;
  };
  Player?: {
    title?: string;
  };
  Metadata: {
    type: 'episode' | 'movie';
    title?: string;
    grandparentTitle?: string;
    parentIndex?: number;
    index?: number;
    duration: number;
    Guid: { id: string }[];
  };
};

export const describePlexPayload = (
  payload: PlexPayload,
  userId: number
): string => {
  const { imdbId, tmdbId, tvdbId } = parsePlexPayload(payload);

  const title =
    payload.Metadata?.type === 'episode'
      ? [
          payload.Metadata.grandparentTitle,
          payload.Metadata.parentIndex !== undefined &&
          payload.Metadata.index !== undefined
            ? `S${payload.Metadata.parentIndex}E${payload.Metadata.index}`
            : undefined,
          payload.Metadata.title,
        ]
          .filter(Boolean)
          .join(' ')
      : payload.Metadata?.title;

  const ids = [
    imdbId ? `imdb:${imdbId}` : undefined,
    tmdbId ? `tmdb:${tmdbId}` : undefined,
    tvdbId ? `tvdb:${tvdbId}` : undefined,
  ].filter(Boolean);

  return [
    `event=${payload.event}`,
    `type=${payload.Metadata?.type}`,
    title ? `title="${title}"` : undefined,
    payload.Account?.title
      ? `account="${payload.Account.title}"`
      : undefined,
    payload.Player?.title ? `player="${payload.Player.title}"` : undefined,
    ids.length > 0 ? `ids=[${ids.join(', ')}]` : undefined,
    `user=${userId}`,
  ]
    .filter(Boolean)
    .join(' ');
};

export const isPlexAccountAllowed = (
  accountTitle: string | undefined,
  allowedAccounts: string[],
  deniedAccounts: string[]
): boolean => {
  const normalized = (accountTitle || '').trim().toLowerCase();
  const matches = (list: string[]) =>
    list.some((entry) => entry.trim().toLowerCase() === normalized);

  if (matches(deniedAccounts)) {
    return false;
  }

  if (allowedAccounts.length === 0) {
    return true;
  }

  return normalized.length > 0 && matches(allowedAccounts);
};

export const getPlexPayload = async (req: Request) => {
  return await new Promise<PlexPayload>((resolve, reject) => {
    const bb = busboy({ headers: req.headers });
    bb.on('field', (name, val) => {
      if (name === 'payload') {
        resolve(JSON.parse(val));
      }
    });
    bb.on('close', () => {
      reject(new Error(`No "payload" filed on Plex webhook body`));
    });
    req.pipe(bb);
  });
};

const parsePlexPayload = (payload: PlexPayload) => {
  const externalIds = (payload.Metadata.Guid || [])
    .map(
      (item) =>
        item.id.match(/^(?<provider>imdb|tmdb|tvdb):\/\/(?<id>\w+)$/)?.groups
    )
    .filter(Boolean)
    .map((match) => ({
      [match.provider]: match.id,
    }))
    .reduce((res, current) => ({ ...res, ...current }), {});

  const imdbId = externalIds.imdb;
  const tmdbId = Number(externalIds.tmdb) || undefined;
  const tvdbId = Number(externalIds.tvdb) || undefined;

  const duration =
    typeof payload.Metadata.duration === 'number'
      ? payload.Metadata.duration / 1000
      : null;

  return {
    imdbId,
    tmdbId,
    tvdbId,
    duration,
  };
};
