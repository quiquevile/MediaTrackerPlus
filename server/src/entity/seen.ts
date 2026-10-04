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

export type SeenHistoryOrderBy = 'date' | 'title';

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
    userRating?: number;
  };
  episode?: {
    id: number;
    seasonNumber: number;
    episodeNumber: number;
    title: string;
  };
};

export type GetSeenHistoryArgs = {
  userId: number;
  mediaType?: string;
  year?: string;
  genre?: string;
  filter?: string;
  onlyWithUserRating?: boolean;
  onlyWithoutUserRating?: boolean;
  orderBy?: SeenHistoryOrderBy;
  sortOrder?: 'asc' | 'desc';
  page?: number;
};
