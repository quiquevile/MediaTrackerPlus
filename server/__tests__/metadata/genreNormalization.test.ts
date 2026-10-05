import {
  mergeGenres,
  normalizeCategoryLadders,
  normalizeGenres,
} from 'src/metadata/genreNormalization';

describe('normalizeGenres', () => {
  test('maps known tags to canonical genres', () => {
    expect(normalizeGenres(['Science fiction', 'Fantasy'])).toEqual([
      'Science Fiction',
      'Fantasy',
    ]);
  });

  test('is case-insensitive and trims whitespace', () => {
    expect(normalizeGenres(['  MYSTERY  '])).toEqual(['Mystery']);
  });

  test('drops denylisted junk tags', () => {
    expect(
      normalizeGenres(['Accessible book', 'Protected DAISY', 'In library'])
    ).toEqual([]);
  });

  test('drops unmapped tags', () => {
    expect(normalizeGenres(['Young adult', 'Poetry'])).toEqual([]);
  });

  test('dedupes genres', () => {
    expect(normalizeGenres(['Mystery', 'mysteries'])).toEqual(['Mystery']);
  });

  test('caps at five genres', () => {
    expect(
      normalizeGenres([
        'Mystery',
        'Fantasy',
        'Romance',
        'Horror',
        'Comedy',
        'Drama',
        'Action',
      ])
    ).toEqual(['Mystery', 'Fantasy', 'Romance', 'Horror', 'Comedy']);
  });

  test('handles undefined and empty input', () => {
    expect(normalizeGenres(undefined)).toEqual([]);
    expect(normalizeGenres([])).toEqual([]);
  });
});

describe('mergeGenres', () => {
  test('merges deduped and capped', () => {
    expect(
      mergeGenres(['Fantasy', 'Drama'], ['Drama', 'Mystery'])
    ).toEqual(['Fantasy', 'Drama', 'Mystery']);
  });

  test('caps at five genres', () => {
    expect(
      mergeGenres(
        ['Mystery', 'Fantasy', 'Romance'],
        ['Horror', 'Comedy', 'Drama', 'Action']
      )
    ).toEqual(['Mystery', 'Fantasy', 'Romance', 'Horror', 'Comedy']);
  });
});

describe('normalizeCategoryLadders', () => {
  test('prefers leaf over root', () => {
    expect(
      normalizeCategoryLadders([
        {
          ladder: [{ name: 'Science Fiction & Fantasy' }, { name: 'Epic' }],
          root: 'Genres',
        },
      ])
    ).toEqual(['Fantasy']);
  });

  test('falls back to root when leaf is unmapped', () => {
    expect(
      normalizeCategoryLadders([
        {
          ladder: [{ name: 'Literature & Fiction' }, { name: 'Classics' }],
          root: 'Genres',
        },
      ])
    ).toEqual(['Drama']);
  });

  test('collects genres across ladders without duplicates', () => {
    expect(
      normalizeCategoryLadders([
        {
          ladder: [
            { name: 'Science Fiction & Fantasy' },
            { name: 'Science Fiction' },
            { name: 'Adventure' },
          ],
          root: 'Genres',
        },
        {
          ladder: [
            { name: 'Science Fiction & Fantasy' },
            { name: 'Science Fiction' },
            { name: 'Space Opera' },
          ],
          root: 'Genres',
        },
      ])
    ).toEqual(['Adventure', 'Science Fiction']);
  });

  test('handles undefined and empty input', () => {
    expect(normalizeCategoryLadders(undefined)).toEqual([]);
    expect(normalizeCategoryLadders([])).toEqual([]);
  });
});
