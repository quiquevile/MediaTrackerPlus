import { Database } from 'src/dbconfig';
import { Seen } from 'src/entity/seen';
import { TvEpisode } from 'src/entity/tvepisode';
import { UserRating } from 'src/entity/userRating';
import { seenRepository } from 'src/repository/seen';
import { Data } from '__tests__/__utils__/data';
import { clearDatabase, runMigrations } from '__tests__/__utils__/utils';

const d = (iso: string) => new Date(iso).getTime();

const items = [
  Data.tvShow,
  { ...Data.movie, genres: 'Drama,Action' },
  { ...Data.book, genres: 'Fantasy' },
];

const seenRows: Seen[] = [
  // movie seen twice
  { id: 1, date: d('2023-05-01'), mediaItemId: Data.movie.id, userId: 0 },
  { id: 2, date: d('2024-06-01'), mediaItemId: Data.movie.id, userId: 0 },
  // episodes seen
  { id: 3, date: d('2024-01-15'), mediaItemId: 1, episodeId: 1, userId: 0 },
  { id: 4, date: d('2022-03-10'), mediaItemId: 1, episodeId: 2, userId: 0 },
  // book seen, undated
  { id: 5, date: null, mediaItemId: Data.book.id, userId: 0 },
  // season 2 episode seen, no votes anywhere near it
  { id: 6, date: d('2021-07-20'), mediaItemId: 1, episodeId: 9, userId: 0 },
];

const season2 = {
  id: 2,
  seasonNumber: 2,
  title: 'Season 2',
  isSpecialSeason: false,
  tvShowId: 1,
  numberOfEpisodes: 1,
};

const season2Episode = {
  id: 9,
  seasonNumber: 2,
  episodeNumber: 1,
  seasonAndEpisodeNumber: 2001,
  seasonId: 2,
  tvShowId: 1,
  title: 'Season 2 Episode 1',
  isSpecialEpisode: false,
  releaseDate: '2001-05-05',
};

const ratings: UserRating[] = [
  {
    userId: 0,
    mediaItemId: Data.movie.id,
    rating: 8,
    date: d('2024-06-02'),
  },
  {
    userId: 0,
    mediaItemId: 1,
    episodeId: 1,
    rating: 9,
    date: d('2024-01-16'),
  },
  // Cleared vote: row kept with NULL rating.
  {
    userId: 0,
    mediaItemId: Data.book.id,
    rating: null,
    date: d('2024-02-01'),
  },
  // Zero vote on the show (item level).
  {
    userId: 0,
    mediaItemId: 1,
    rating: 0,
    date: d('2024-02-02'),
  },
];

describe('seen history', () => {
  beforeAll(runMigrations);
  afterAll(clearDatabase);

  beforeAll(async () => {
    await Database.knex('user').insert(Data.user);
    await Database.knex('mediaItem').insert(items);
    await Database.knex('season').insert([Data.season, season2]);
    await Database.knex('episode').insert([
      Data.episode as TvEpisode,
      Data.episode2 as TvEpisode,
      Data.episode3 as TvEpisode,
      season2Episode as TvEpisode,
    ]);
    await Database.knex('seen').insert(seenRows);
    await Database.knex('userRating').insert(ratings);
    await Database.knex('list').insert(Data.watchlist);
    await Database.knex('listItem').insert({
      listId: Data.watchlist.id,
      mediaItemId: Data.movie.id,
      addedAt: new Date().getTime(),
    });
  });

  test('default: all entries, most recent first, undated last', async () => {
    const res = await seenRepository.history({ userId: 0 });

    expect(res.total).toEqual(6);
    expect(res.data.map((e) => e.id)).toEqual([2, 3, 1, 4, 6, 5]);
    expect(res.data[0].mediaItem.title).toEqual('movie');
    expect(res.data[1].episode.episodeNumber).toEqual(1);
    expect(res.data[5].date).toBeNull();
  });

  test('filter by media type', async () => {
    const res = await seenRepository.history({
      userId: 0,
      mediaTypes: 'movie',
    });

    expect(res.total).toEqual(2);
    expect(
      res.data.every((e) => e.mediaItem.mediaType === 'movie')
    ).toEqual(true);
  });

  test('filter by multiple media types (OR)', async () => {
    const res = await seenRepository.history({
      userId: 0,
      mediaTypes: 'movie, book',
    });

    expect(res.data.map((e) => e.id).sort()).toEqual([1, 2, 5]);
  });

  test('filter by viewing year', async () => {
    const res = await seenRepository.history({
      userId: 0,
      viewedYears: '2024',
    });

    expect(res.data.map((e) => e.id).sort()).toEqual([2, 3]);
  });

  test('filter by multiple viewing years (OR)', async () => {
    const res = await seenRepository.history({
      userId: 0,
      viewedYears: '2024, 2022',
    });

    expect(res.data.map((e) => e.id).sort()).toEqual([2, 3, 4]);
  });

  test('invalid viewing years are ignored', async () => {
    const res = await seenRepository.history({
      userId: 0,
      viewedYears: 'bogus,2023',
    });

    expect(res.data.map((e) => e.id)).toEqual([1]);
  });

  test('filter by release year', async () => {
    const res = await seenRepository.history({
      userId: 0,
      releaseYears: '2001',
    });

    expect(res.data.map((e) => e.id).sort()).toEqual([1, 2]);
  });

  test('viewing and release years combine with AND', async () => {
    const res = await seenRepository.history({
      userId: 0,
      viewedYears: '2024',
      releaseYears: '2002',
    });

    expect(res.data.map((e) => e.id)).toEqual([3]);
  });

  test('filter by genre', async () => {
    const res = await seenRepository.history({ userId: 0, genres: 'Drama' });

    expect(res.data.map((e) => e.id).sort()).toEqual([1, 2]);
  });

  test('filter by multiple genres (OR)', async () => {
    const res = await seenRepository.history({
      userId: 0,
      genres: 'Fantasy,Drama',
    });

    expect(res.data.map((e) => e.id).sort()).toEqual([1, 2, 5]);
  });

  test('filter by title', async () => {
    const res = await seenRepository.history({ userId: 0, filter: 'book' });

    expect(res.total).toEqual(1);
    expect(res.data[0].mediaItem.title).toEqual('book');
  });

  test('rated (any level) and unrated', async () => {
    const rated = await seenRepository.history({
      userId: 0,
      ratingFilter: 'rated',
    });
    expect(rated.data.map((e) => e.id).sort()).toEqual([1, 2, 3]);

    const unrated = await seenRepository.history({
      userId: 0,
      ratingFilter: 'unrated',
    });
    expect(unrated.data.map((e) => e.id).sort()).toEqual([4, 5, 6]);
  });

  test('cleared and zero votes count as unrated', async () => {
    // Fixtures: book entry (id 5) has a NULL rating row, show entries have
    // an item-level zero rating but no episode ratings.
    const rated = await seenRepository.history({
      userId: 0,
      ratingFilter: 'rated',
    });
    expect(rated.data.map((e) => e.id).sort()).toEqual([1, 2, 3]);

    const unrated = await seenRepository.history({
      userId: 0,
      ratingFilter: 'unrated',
    });
    expect(unrated.data.map((e) => e.id).sort()).toEqual([4, 5, 6]);

    const bookEntry = unrated.data.find((e) => e.id === 5);
    expect(bookEntry.mediaItem.userRating.rating).toBeNull();
  });

  test('per-level unrated filters', async () => {
    // No season ratings in fixtures: both show entries lack season votes.
    const unratedSeason = await seenRepository.history({
      userId: 0,
      ratingFilter: 'unrated-season',
    });
    expect(unratedSeason.data.map((e) => e.id).sort()).toEqual([3, 4, 6]);

    // Only show entries (3, 4) can match; the show has no item-level vote.
    const unratedShow = await seenRepository.history({
      userId: 0,
      ratingFilter: 'unrated-show',
    });
    expect(unratedShow.data.map((e) => e.id).sort()).toEqual([3, 4, 6]);

    // Episode 1 is voted, episode 2 is not.
    const unratedEpisode = await seenRepository.history({
      userId: 0,
      ratingFilter: 'unrated-episode',
    });
    expect(unratedEpisode.data.map((e) => e.id)).toEqual([4, 6]);
  });

  test('entry carries season data', async () => {
    const res = await seenRepository.history({ userId: 0 });

    const entry = res.data.find((e) => e.id === 3);

    expect(entry.season).toMatchObject({ id: 1, seasonNumber: 1 });
    expect(entry.season.userRating).toBeUndefined();
    expect(entry.episode.seasonId).toEqual(1);
  });

  test('season vote counts entry as rated and clears unrated-season', async () => {
    await Database.knex('userRating').insert({
      userId: 0,
      mediaItemId: 1,
      seasonId: 1,
      rating: 7,
      date: d('2024-03-01'),
    });

    const rated = await seenRepository.history({
      userId: 0,
      ratingFilter: 'rated',
    });
    expect(rated.data.map((e) => e.id).sort()).toEqual([1, 2, 3, 4]);

    // The season 1 vote must not mark the season 2 entry as rated.
    const unratedSeason = await seenRepository.history({
      userId: 0,
      ratingFilter: 'unrated-season',
    });
    expect(unratedSeason.data.map((e) => e.id)).toEqual([6]);

    const unrated = await seenRepository.history({
      userId: 0,
      ratingFilter: 'unrated',
    });
    expect(unrated.data.map((e) => e.id).sort()).toEqual([5, 6]);

    const entry = (
      await seenRepository.history({ userId: 0 })
    ).data.find((e) => e.id === 3);
    expect(entry.season.userRating).toMatchObject({ rating: 7 });
  });

  test('order by title', async () => {
    const res = await seenRepository.history({
      userId: 0,
      orderBy: 'title',
      sortOrder: 'asc',
    });

    expect(res.data.map((e) => e.mediaItem.title)).toEqual([
      'book',
      'movie',
      'movie',
      'title',
      'title',
      'title',
    ]);
  });

  test('other users see nothing', async () => {
    const res = await seenRepository.history({ userId: 999 });

    expect(res.total).toEqual(0);
  });

  test('facets list existing years and genres', async () => {
    const facets = await seenRepository.historyFacets(0);

    expect(facets.viewedYears).toEqual(['2024', '2023', '2022', '2021']);
    expect(facets.releaseYears).toEqual(['2002', '2001']);
    expect(facets.genres).toEqual(['Action', 'Drama', 'Fantasy']);
  });

  test('facets are empty for unknown users', async () => {
    const facets = await seenRepository.historyFacets(999);

    expect(facets).toEqual({ viewedYears: [], releaseYears: [], genres: [] });
  });

  test('episode entries carry GridItem data', async () => {
    const res = await seenRepository.history({ userId: 0 });

    const entry = res.data.find((e) => e.id === 3);

    expect(entry.episode).toMatchObject({
      id: 1,
      seasonNumber: 1,
      episodeNumber: 1,
      title: 'Episode 1',
      tvShowId: 1,
      seen: true,
    });
    expect(entry.episode.lastSeenAt).toEqual(entry.date);
    expect(entry.episode.userRating).toMatchObject({ rating: 9 });
  });

  test('show entries carry unwatched badges and watchlist state', async () => {
    const res = await seenRepository.history({ userId: 0 });

    const showEntry = res.data.find((e) => e.id === 3);

    expect(showEntry.mediaItem.firstUnwatchedEpisode).toMatchObject({
      seasonNumber: 1,
      episodeNumber: 3,
    });
    expect(showEntry.mediaItem.unseenEpisodesCount).toEqual(1);
    expect(showEntry.mediaItem.seen).toEqual(false);
    expect(showEntry.mediaItem.onWatchlist).toEqual(false);

    const movieEntry = res.data.find((e) => e.id === 2);

    expect(movieEntry.mediaItem.userRating).toMatchObject({ rating: 8 });
    expect(movieEntry.mediaItem.onWatchlist).toEqual(true);
    expect(movieEntry.mediaItem.seen).toEqual(true);
    expect(
      movieEntry.mediaItem.firstUnwatchedEpisode
    ).toBeUndefined();
  });
});
