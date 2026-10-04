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
