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
];

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
];

describe('seen history', () => {
  beforeAll(runMigrations);
  afterAll(clearDatabase);

  beforeAll(async () => {
    await Database.knex('user').insert(Data.user);
    await Database.knex('mediaItem').insert(items);
    await Database.knex('season').insert(Data.season);
    await Database.knex('episode').insert([
      Data.episode as TvEpisode,
      Data.episode2 as TvEpisode,
    ]);
    await Database.knex('seen').insert(seenRows);
    await Database.knex('userRating').insert(ratings);
  });

  test('default: all entries, most recent first, undated last', async () => {
    const res = await seenRepository.history({ userId: 0 });

    expect(res.total).toEqual(5);
    expect(res.data.map((e) => e.id)).toEqual([2, 3, 1, 4, 5]);
    expect(res.data[0].mediaItem.title).toEqual('movie');
    expect(res.data[1].episode.episodeNumber).toEqual(1);
    expect(res.data[4].date).toBeNull();
  });

  test('filter by media type', async () => {
    const res = await seenRepository.history({
      userId: 0,
      mediaType: 'movie',
    });

    expect(res.total).toEqual(2);
    expect(
      res.data.every((e) => e.mediaItem.mediaType === 'movie')
    ).toEqual(true);
  });

  test('filter by viewing year', async () => {
    const res = await seenRepository.history({ userId: 0, year: '2024' });

    expect(res.data.map((e) => e.id).sort()).toEqual([2, 3]);
  });

  test('filter by genre', async () => {
    const res = await seenRepository.history({ userId: 0, genre: 'Drama' });

    expect(res.data.map((e) => e.id).sort()).toEqual([1, 2]);
  });

  test('filter by title', async () => {
    const res = await seenRepository.history({ userId: 0, filter: 'book' });

    expect(res.total).toEqual(1);
    expect(res.data[0].mediaItem.title).toEqual('book');
  });

  test('only rated and only unrated', async () => {
    const rated = await seenRepository.history({
      userId: 0,
      onlyWithUserRating: true,
    });
    expect(rated.data.map((e) => e.id).sort()).toEqual([1, 2, 3]);

    const unrated = await seenRepository.history({
      userId: 0,
      onlyWithoutUserRating: true,
    });
    expect(unrated.data.map((e) => e.id).sort()).toEqual([4, 5]);
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
    ]);
  });

  test('other users see nothing', async () => {
    const res = await seenRepository.history({ userId: 999 });

    expect(res.total).toEqual(0);
  });
});
