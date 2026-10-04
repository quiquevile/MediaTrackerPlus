import { useQuery } from 'react-query';

import { Seen } from 'mediatracker-api';
import { mediaTrackerApi } from 'src/api/api';

export const useSeenHistory = (args: Seen.History.RequestQuery) => {
  const { error, data, isFetched } = useQuery(['seenHistory', args], async () =>
    mediaTrackerApi.seen.history(args)
  );

  return {
    entries: data?.data,
    error: error,
    isLoading: !isFetched,
    numberOfPages: data?.totalPages,
    numberOfItemsTotal: data?.total,
  };
};

export const useSeenHistoryFacets = () => {
  const { data, isFetched } = useQuery(['seenHistoryFacets'], async () =>
    mediaTrackerApi.seen.historyFacets()
  );

  return {
    viewedYears: data?.viewedYears || [],
    releaseYears: data?.releaseYears || [],
    genres: data?.genres || [],
    isLoading: !isFetched,
  };
};
