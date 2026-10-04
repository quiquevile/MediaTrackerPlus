import { Database } from 'src/dbconfig';
import {
  GetSeenHistoryArgs,
  SeenHistoryEntry,
} from 'src/entity/seen';
import { Pagination } from 'src/repository/mediaItem';
import { Knex } from 'knex';

const itemsPerPage = 40;

const yearPattern = /^[0-9]{4}$/;

const applyFilters = (query: Knex.QueryBuilder, args: GetSeenHistoryArgs) => {
  const {
    userId,
    mediaType,
    year,
    genre,
    filter,
    onlyWithUserRating,
    onlyWithoutUserRating,
  } = args;

  query.where('seen.userId', userId);

  if (mediaType) {
    query.andWhere('mediaItem.mediaType', mediaType);
  }

  if (genre) {
    query.andWhere('mediaItem.genres', 'LIKE', `%${genre}%`);
  }

  if (filter) {
    query.andWhere('mediaItem.title', 'LIKE', `%${filter}%`);
  }

  if (year && yearPattern.test(year)) {
    query.andWhere(
      Database.knex.raw(
        `strftime('%Y', datetime("seen"."date" / 1000, 'unixepoch')) = ?`,
        [year]
      )
    );
  }

  if (onlyWithUserRating || onlyWithoutUserRating) {
    const ratingExists = (qb: Knex.QueryBuilder) =>
      qb
        .select('id')
        .from('userRating')
        .where('userRating.userId', userId)
        .whereRaw('"userRating"."mediaItemId" = "seen"."mediaItemId"')
        .andWhere((builder: Knex.QueryBuilder) =>
          builder
            .whereRaw(
              '"userRating"."episodeId" IS NULL AND "seen"."episodeId" IS NULL'
            )
            .orWhereRaw(
              '"userRating"."episodeId" IS NOT NULL AND "userRating"."episodeId" = "seen"."episodeId"'
            )
            .orWhereRaw(
              '"userRating"."episodeId" IS NULL AND "seen"."episodeId" IS NOT NULL'
            )
        );

    if (onlyWithUserRating) {
      query.whereExists(ratingExists);
    }

    if (onlyWithoutUserRating) {
      query.whereNotExists(ratingExists);
    }
  }

  return query;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapRow = (row: any): SeenHistoryEntry => ({
  id: row['seenId'],
  date: row['seenDate'],
  mediaItem: {
    id: row['mediaItemId'],
    title: row['mediaItemTitle'],
    mediaType: row['mediaItemMediaType'],
    releaseDate: row['mediaItemReleaseDate'],
    genres: row['mediaItemGenres']?.split(','),
    poster: row['mediaItemPosterId']
      ? `/img/${row['mediaItemPosterId']}`
      : undefined,
    posterSmall: row['mediaItemPosterId']
      ? `/img/${row['mediaItemPosterId']}?size=small`
      : undefined,
    userRating: row['userRatingRating'],
  },
  episode: row['episodeId']
    ? {
        id: row['episodeId'],
        seasonNumber: row['episodeSeasonNumber'],
        episodeNumber: row['episodeEpisodeNumber'],
        title: row['episodeTitle'],
      }
    : undefined,
});

export const getSeenHistoryKnex = async (
  args: GetSeenHistoryArgs
): Promise<Pagination<SeenHistoryEntry>> => {
  const { orderBy, page } = args;
  const sortOrder = args.sortOrder || 'desc';

  if (!['asc', 'desc'].includes(sortOrder)) {
    throw new Error(`Unsupported sort order: ${sortOrder}`);
  }

  if (page !== undefined && page <= 0) {
    throw new Error('Invalid page number');
  }

  const baseQuery = () =>
    applyFilters(
      Database.knex
        .select({
          seenId: 'seen.id',
          seenDate: 'seen.date',
          mediaItemId: 'mediaItem.id',
          mediaItemTitle: 'mediaItem.title',
          mediaItemMediaType: 'mediaItem.mediaType',
          mediaItemReleaseDate: 'mediaItem.releaseDate',
          mediaItemGenres: 'mediaItem.genres',
          mediaItemPosterId: 'mediaItem.posterId',
          episodeId: 'episode.id',
          episodeSeasonNumber: 'episode.seasonNumber',
          episodeEpisodeNumber: 'episode.episodeNumber',
          episodeTitle: 'episode.title',
          userRatingRating: Database.knex
            .select(Database.knex.raw('MAX("rating")'))
            .from('userRating')
            .where('userRating.userId', args.userId)
            .whereRaw('"userRating"."mediaItemId" = "seen"."mediaItemId"')
            .andWhere((builder: Knex.QueryBuilder) =>
              builder
                .whereNull('userRating.episodeId')
                .orWhereRaw(
                  '"userRating"."episodeId" = "seen"."episodeId"'
                )
            ),
        })
        .from('seen')
        .join('mediaItem', 'mediaItem.id', 'seen.mediaItemId')
        .leftJoin('episode', 'episode.id', 'seen.episodeId'),
      args
    );

  const applyOrder = (query: Knex.QueryBuilder) => {
    if (orderBy === 'title') {
      query.orderBy('mediaItem.title', sortOrder);
    } else {
      // Undated entries always last, regardless of direction.
      query
        .orderByRaw('"seen"."date" IS NULL')
        .orderBy('seen.date', sortOrder);
    }

    query.orderBy('seen.id', sortOrder);

    return query;
  };

  if (page) {
    const [resCount, res] = await Database.knex.transaction(async (trx) => {
      const resCount = await baseQuery()
        .clearSelect()
        .count({ count: '*' })
        .transacting(trx);
      const res = await applyOrder(baseQuery())
        .limit(itemsPerPage)
        .offset(itemsPerPage * (page - 1))
        .transacting(trx);

      return [resCount, res];
    });

    const total = Number(resCount[0].count);
    const from = itemsPerPage * (page - 1);
    const to = Math.min(total, itemsPerPage * page);
    const totalPages = Math.ceil(total / itemsPerPage);

    if (from > total) {
      throw new Error('Invalid page number');
    }

    return {
      from: from,
      to: to,
      data: res.map(mapRow),
      total: total,
      page: page,
      totalPages: totalPages,
    };
  }

  const res = await applyOrder(baseQuery());

  return {
    from: 0,
    to: res.length,
    data: res.map(mapRow),
    total: res.length,
    page: 1,
    totalPages: 1,
  };
};
