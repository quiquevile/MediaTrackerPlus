import { Database } from 'src/dbconfig';
import {
  GetSeenHistoryArgs,
  SeenHistoryEntry,
  SeenHistoryFacets,
} from 'src/entity/seen';
import { Pagination } from 'src/repository/mediaItem';
import { Knex } from 'knex';

const itemsPerPage = 40;

const yearPattern = /^[0-9]{4}$/;

const splitList = (value?: string): string[] =>
  (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

const applyFilters = (query: Knex.QueryBuilder, args: GetSeenHistoryArgs) => {
  const {
    userId,
    mediaType,
    viewedYears,
    releaseYears,
    genres,
    filter,
    onlyWithUserRating,
    onlyWithoutUserRating,
  } = args;

  query.where('seen.userId', userId);

  if (mediaType) {
    query.andWhere('mediaItem.mediaType', mediaType);
  }

  const genreValues = splitList(genres);

  if (genreValues.length > 0) {
    query.andWhere((builder: Knex.QueryBuilder) => {
      genreValues.forEach((genre, index) => {
        if (index === 0) {
          builder.where('mediaItem.genres', 'LIKE', `%${genre}%`);
        } else {
          builder.orWhere('mediaItem.genres', 'LIKE', `%${genre}%`);
        }
      });
    });
  }

  if (filter) {
    query.andWhere('mediaItem.title', 'LIKE', `%${filter}%`);
  }

  const viewedYearValues = splitList(viewedYears).filter((year) =>
    yearPattern.test(year)
  );

  if (viewedYearValues.length > 0) {
    query.andWhere(
      Database.knex.raw(
        `strftime('%Y', datetime("seen"."date" / 1000, 'unixepoch')) in (${viewedYearValues
          .map(() => '?')
          .join(', ')})`,
        viewedYearValues
      )
    );
  }

  const releaseYearValues = splitList(releaseYears).filter((year) =>
    yearPattern.test(year)
  );

  if (releaseYearValues.length > 0) {
    query.andWhere(
      Database.knex.raw(
        `substr("mediaItem"."releaseDate", 1, 4) in (${releaseYearValues
          .map(() => '?')
          .join(', ')})`,
        releaseYearValues
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

export const getSeenHistoryFacetsKnex = async (
  userId: number
): Promise<SeenHistoryFacets> => {
  const viewedYearRows = await Database.knex('seen')
    .distinct(
      Database.knex.raw(
        `strftime('%Y', datetime("date" / 1000, 'unixepoch')) as year`
      )
    )
    .where('userId', userId)
    .whereNotNull('date')
    .orderBy('year', 'desc');

  const releaseYearRows = await Database.knex('mediaItem')
    .distinct(
      Database.knex.raw(
        `substr("mediaItem"."releaseDate", 1, 4) as year`
      )
    )
    .join('seen', 'seen.mediaItemId', 'mediaItem.id')
    .where('seen.userId', userId)
    .whereNotNull('mediaItem.releaseDate')
    .whereNot('mediaItem.releaseDate', '')
    .orderBy('year', 'desc');

  const genreRows = await Database.knex('mediaItem')
    .select('mediaItem.genres')
    .join('seen', 'seen.mediaItemId', 'mediaItem.id')
    .where('seen.userId', userId)
    .whereNotNull('mediaItem.genres')
    .groupBy('mediaItem.genres');

  const genres = [
    ...new Set(
      genreRows.flatMap((row) =>
        String(row['genres'])
          .split(',')
          .map((genre) => genre.trim())
          .filter((genre) => genre.length > 0)
      )
    ),
  ].sort((a, b) => a.localeCompare(b));

  return {
    viewedYears: viewedYearRows.map((row) => String(row['year'])),
    releaseYears: releaseYearRows
      .map((row) => String(row['year']))
      .filter((year) => yearPattern.test(year)),
    genres: genres,
  };
};
