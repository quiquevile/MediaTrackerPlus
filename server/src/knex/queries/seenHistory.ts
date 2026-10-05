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
    mediaTypes,
    viewedYears,
    releaseYears,
    genres,
    filter,
    onlyWithUserRating,
    onlyWithoutUserRating,
  } = args;

  query.where('seen.userId', userId);

  const mediaTypeValues = splitList(mediaTypes);

  if (mediaTypeValues.length > 0) {
    query.whereIn('mediaItem.mediaType', mediaTypeValues);
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
    // Rated means an actual vote: cleared (NULL) and zero ratings count
    // as unrated, same as never-rated entries.
    const ratingExists = (qb: Knex.QueryBuilder) =>
      qb
        .select('id')
        .from('userRating')
        .where('userRating.userId', userId)
        .whereRaw('"userRating"."mediaItemId" = "seen"."mediaItemId"')
        .where('userRating.rating', '>', 0)
        .andWhere((builder: Knex.QueryBuilder) =>
          builder
            .whereRaw(
              '"userRating"."episodeId" IS NULL AND "seen"."episodeId" IS NULL'
            )
            .orWhereRaw(
              '"userRating"."episodeId" IS NOT NULL AND "userRating"."episodeId" = "seen"."episodeId"'
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
    userRating: row['itemRating.id']
      ? {
          id: row['itemRating.id'],
          date: row['itemRating.date'],
          mediaItemId: row['mediaItemId'],
          userId: row['itemRating.userId'],
          rating: row['itemRating.rating'],
          review: row['itemRating.review'],
        }
      : undefined,
    firstUnwatchedEpisode: row['firstUnwatchedEpisode.id']
      ? {
          id: row['firstUnwatchedEpisode.id'],
          seasonNumber: row['firstUnwatchedEpisode.seasonNumber'],
          episodeNumber: row['firstUnwatchedEpisode.episodeNumber'],
        }
      : undefined,
    unseenEpisodesCount: row['unseenEpisodesCount'] || 0,
    onWatchlist: Boolean(row['listItem.id']),
    seen:
      row['mediaItemMediaType'] === 'tv'
        ? row['numberOfEpisodes'] > 0 && !row['unseenEpisodesCount']
        : true,
    lastSeenAt: row['seenDate'],
  },
  episode: row['episodeId']
    ? {
        id: row['episodeId'],
        seasonNumber: row['episodeSeasonNumber'],
        episodeNumber: row['episodeEpisodeNumber'],
        title: row['episodeTitle'],
        tvShowId: row['mediaItemId'],
        userRating: row['episodeRating.id']
          ? {
              id: row['episodeRating.id'],
              date: row['episodeRating.date'],
              mediaItemId: row['mediaItemId'],
              userId: row['episodeRating.userId'],
              rating: row['episodeRating.rating'],
              review: row['episodeRating.review'],
              episodeId: row['episodeId'],
            }
          : undefined,
        seen: true,
        lastSeenAt: row['seenDate'],
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

  const currentDateString = new Date().toISOString();

  const watchlist = await Database.knex('list')
    .select('id')
    .where('userId', args.userId)
    .where('isWatchlist', true)
    .first();

  const watchlistId = watchlist?.id ?? -1;

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
          'itemRating.id': 'itemRating.id',
          'itemRating.date': 'itemRating.date',
          'itemRating.userId': 'itemRating.userId',
          'itemRating.rating': 'itemRating.rating',
          'itemRating.review': 'itemRating.review',
          'episodeRating.id': 'episodeRating.id',
          'episodeRating.date': 'episodeRating.date',
          'episodeRating.userId': 'episodeRating.userId',
          'episodeRating.rating': 'episodeRating.rating',
          'episodeRating.review': 'episodeRating.review',
          'firstUnwatchedEpisode.id': 'firstUnwatchedEpisode.id',
          'firstUnwatchedEpisode.seasonNumber':
            'firstUnwatchedEpisode.seasonNumber',
          'firstUnwatchedEpisode.episodeNumber':
            'firstUnwatchedEpisode.episodeNumber',
          unseenEpisodesCount: 'unseenEpisodesCount',
          numberOfEpisodes: 'numberOfEpisodes',
          'listItem.id': 'listItem.id',
        })
        .from('seen')
        .join('mediaItem', 'mediaItem.id', 'seen.mediaItemId')
        .leftJoin('episode', 'episode.id', 'seen.episodeId')
        .leftJoin('userRating as itemRating', function () {
          this.onVal('itemRating.userId', args.userId)
            .andOn('itemRating.mediaItemId', '=', 'seen.mediaItemId')
            .andOnNull('itemRating.episodeId')
            .andOnNull('itemRating.seasonId');
        })
        .leftJoin('userRating as episodeRating', function () {
          this.onVal('episodeRating.userId', args.userId).andOn(
            'episodeRating.episodeId',
            '=',
            'seen.episodeId'
          );
        })
        .leftJoin('listItem', function () {
          this.on('listItem.mediaItemId', '=', 'mediaItem.id')
            .andOnNull('listItem.seasonId')
            .andOnNull('listItem.episodeId')
            .andOnVal('listItem.listId', watchlistId);
        })
        .leftJoin(
          (qb: Knex.QueryBuilder) =>
            qb
              .from('episode')
              .select('tvShowId')
              .min('seasonAndEpisodeNumber', {
                as: 'seasonAndEpisodeNumber',
              })
              .count('*', { as: 'unseenEpisodesCount' })
              .leftJoin(
                (qb: Knex.QueryBuilder) =>
                  qb
                    .from('seen')
                    .where('userId', args.userId)
                    .as('seen'),
                'seen.episodeId',
                'episode.id'
              )
              .whereNot('episode.isSpecialEpisode', true)
              .whereNot('episode.releaseDate', '')
              .whereNot('episode.releaseDate', null)
              .where('episode.releaseDate', '<=', currentDateString)
              .whereNull('seen.userId')
              .groupBy('tvShowId')
              .as('unseenEpisodesHelper'),
          'unseenEpisodesHelper.tvShowId',
          'mediaItem.id'
        )
        .leftJoin('episode as firstUnwatchedEpisode', function () {
          this.on(
            'firstUnwatchedEpisode.tvShowId',
            '=',
            'mediaItem.id'
          ).andOn(
            'firstUnwatchedEpisode.seasonAndEpisodeNumber',
            '=',
            'unseenEpisodesHelper.seasonAndEpisodeNumber'
          );
        })
        .leftJoin(
          (qb: Knex.QueryBuilder) =>
            qb
              .select('tvShowId')
              .count('*', { as: 'numberOfEpisodes' })
              .from('episode')
              .whereNot('isSpecialEpisode', true)
              .andWhereNot('releaseDate', '')
              .andWhereNot('releaseDate', null)
              .where('releaseDate', '<=', currentDateString)
              .groupBy('tvShowId')
              .as('numberOfEpisodes'),
          'numberOfEpisodes.tvShowId',
          'mediaItem.id'
        ),
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
