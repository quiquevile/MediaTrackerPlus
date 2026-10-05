/**
 * Normalizes free-form genre tags from metadata providers (OpenLibrary
 * subjects, Audible category ladders) into the canonical TMDB-style genre
 * names used by movies and TV shows, so the genre filter works across all
 * media types.
 */

const MAX_GENRES = 5;

// Lowercase tag/ladder name → canonical genre.
const genreMap: Record<string, string> = {
  // Fiction buckets
  'science fiction': 'Science Fiction',
  sciencefiction: 'Science Fiction',
  'science-fiction': 'Science Fiction',
  'sci-fi': 'Science Fiction',
  scifi: 'Science Fiction',
  'space opera': 'Science Fiction',
  fantasy: 'Fantasy',
  'epic fantasy': 'Fantasy',
  'fantasy fiction': 'Fantasy',
  epic: 'Fantasy',
  magic: 'Fantasy',
  wizards: 'Fantasy',
  witches: 'Fantasy',
  mystery: 'Mystery',
  mysteries: 'Mystery',
  'mystery fiction': 'Mystery',
  'cozy mysteries': 'Mystery',
  'detective and mystery stories': 'Mystery',
  'detective stories': 'Mystery',
  'mysteries & thrillers': 'Mystery',
  thriller: 'Thriller',
  thrillers: 'Thriller',
  'thriller & suspense': 'Thriller',
  suspense: 'Thriller',
  'psychological suspense': 'Thriller',
  horror: 'Horror',
  'ghost stories': 'Horror',
  ghosts: 'Horror',
  vampires: 'Horror',
  monsters: 'Horror',
  romance: 'Romance',
  'love stories': 'Romance',
  'historical fiction': 'History',
  history: 'History',
  adventure: 'Adventure',
  'adventure stories': 'Adventure',
  crime: 'Crime',
  'crime fiction': 'Crime',
  'true crime': 'Crime',
  comedy: 'Comedy',
  humor: 'Comedy',
  'humorous stories': 'Comedy',
  drama: 'Drama',
  'literature & fiction': 'Drama',
  'literature-and-fiction': 'Drama',
  literature: 'Drama',
  fiction: 'Drama',
  action: 'Action',
  'action & adventure': 'Action',
  animation: 'Animation',
  westerns: 'Western',
  war: 'War',
  music: 'Music',
  family: 'Family',
  'juvenile fiction': 'Family',
  children: 'Family',
  "children's audiobooks": 'Family',
  "children's books": 'Family',
  // Non-fiction bucket
  documentary: 'Documentary',
  biography: 'Documentary',
  biographies: 'Documentary',
  'biographies & memoirs': 'Documentary',
  autobiography: 'Documentary',
  memoir: 'Documentary',
  nonfiction: 'Documentary',
  'non-fiction': 'Documentary',
  science: 'Documentary',
  'popular science': 'Documentary',
  business: 'Documentary',
  'business & careers': 'Documentary',
  'self development': 'Documentary',
  'self-help': 'Documentary',
  religion: 'Documentary',
  philosophy: 'Documentary',
};

// Lowercase tags that never become genres (accessibility/format metadata,
// library logistics, age ranges without genre signal, ...).
const genreDenylist = new Set([
  'accessible book',
  'protected daisy',
  'in library',
  'large type books',
  'overdrive',
  'internet archive',
  'americana',
  'english literature',
  'american literature',
  'french literature',
  'german literature',
  'juvenile literature',
  'young adult',
  'teen fiction',
  'poetry',
  'essays',
  'short stories',
  'anthologies',
  'audiobook',
  'audiobooks',
  'ebook',
  'ebooks',
  'printdisabled',
  'daisy',
  'braille',
]);

export const normalizeGenres = (tags: string[] | undefined): string[] => {  if (!tags) {
    return [];
  }

  const genres: string[] = [];

  for (const tag of tags) {
    if (genres.length >= MAX_GENRES) {
      break;
    }

    const key = tag.trim().toLowerCase();

    if (!key || genreDenylist.has(key)) {
      continue;
    }

    const genre = genreMap[key];

    if (genre && !genres.includes(genre)) {
      genres.push(genre);
    }
  }

  return genres;
};

/**
 * Merges normalized genre lists (deduped, capped).
 */
export const mergeGenres = (...lists: string[][]): string[] => {
  const merged: string[] = [];

  for (const list of lists) {
    for (const genre of list) {
      if (merged.length >= MAX_GENRES) {
        return merged;
      }

      if (!merged.includes(genre)) {
        merged.push(genre);
      }
    }
  }

  return merged;
};

/**
 * Normalizes Audible category ladders (leaf to root, first mapping wins)
 * into canonical genres.
 */
export const normalizeCategoryLadders = (
  ladders:
    | {
        ladder?: { name?: string }[];
        root?: string;
      }[]
    | undefined
): string[] => {
  if (!ladders) {
    return [];
  }

  const genres: string[] = [];

  for (const entry of ladders) {
    if (genres.length >= MAX_GENRES) {
      break;
    }

    const names = [...(entry.ladder || [])]
      .map((step) => step?.name)
      .filter(Boolean)
      .reverse();

    for (const name of names) {
      if (genres.length >= MAX_GENRES) {
        break;
      }

      const key = name.trim().toLowerCase();

      if (!key || genreDenylist.has(key)) {
        continue;
      }

      const genre = genreMap[key];

      if (genre && !genres.includes(genre)) {
        genres.push(genre);
        break;
      }
    }
  }

  return genres;
};
