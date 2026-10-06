export type Seen = {
  id?: number;
  date?: number;
  mediaItemId: number;
  episodeId?: number;
  userId: number;
  duration?: number;
};

export const seenColumns = <const>[
  'date',
  'id',
  'mediaItemId',
  'episodeId',
  'userId',
  'duration',
];

export class SeenFilters {
  public static mediaItemSeenValue = (seen: Seen) => {
    return Boolean(!seen.episodeId);
  };

  public static episodeSeenValue = (seen: Seen) => {
    return Boolean(seen.episodeId);
  };
}

import { UserRating } from 'src/entity/userRating';

export type SeenHistoryOrderBy = 'date' | 'title';

export type SeenHistoryRatingFilter =
  | 'rated'
  | 'unrated'
  | 'unrated-show'
  | 'unrated-season'
  | 'unrated-episode';

export type SeenHistoryEntry = {
  id: number;
  date?: number;
  mediaItem: {
    id: number;
    title: string;
    mediaType: string;
    releaseDate?: string;
    genres?: string[];
    poster?: string;
    posterSmall?: string;
    userRating?: UserRating;
    firstUnwatchedEpisode?: {
      id: number;
      seasonNumber: number;
      episodeNumber: number;
    };
    unseenEpisodesCount?: number;
    onWatchlist?: boolean;
    seen?: boolean;
    lastSeenAt?: number;
  };
  episode?: {
    id: number;
    seasonNumber: number;
    episodeNumber: number;
    title: string;
    tvShowId: number;
    seasonId?: number;
    userRating?: UserRating;
    seen?: boolean;
    lastSeenAt?: number;
  };
  season?: {
    id: number;
    seasonNumber: number;
    userRating?: UserRating;
  };
};

export type GetSeenHistoryArgs = {
  userId: number;
  mediaTypes?: string;
  viewedYears?: string;
  releaseYears?: string;
  genres?: string;
  filter?: string;
  ratingFilter?: SeenHistoryRatingFilter;
  orderBy?: SeenHistoryOrderBy;
  sortOrder?: 'asc' | 'desc';
  page?: number;
};

export type SeenHistoryFacets = {
  viewedYears: string[];
  releaseYears: string[];
  genres: string[];
};
