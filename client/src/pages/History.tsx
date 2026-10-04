import React, { FormEventHandler, FunctionComponent, useState } from 'react';
import clsx from 'clsx';
import { t, Trans } from '@lingui/macro';

import { MediaType } from 'mediatracker-api';
import { useSeenHistory } from 'src/api/history';
import { HistoryPanel } from 'src/components/HistoryPanel';
import { Pagination } from 'src/components/PaginatedGridItems';

const mediaTypes: { value?: MediaType; label: string }[] = [
  { value: undefined, label: t`All` },
  { value: 'movie', label: t`Movies` },
  { value: 'tv', label: t`Tv` },
  { value: 'video_game', label: t`Games` },
  { value: 'book', label: t`Books` },
  { value: 'audiobook', label: t`Audiobooks` },
];

type RatedFilter = 'all' | 'rated' | 'unrated';

export const HistoryPage: FunctionComponent = () => {
  const [page, setPage] = useState<number>(1);
  const [mediaType, setMediaType] = useState<MediaType | undefined>(undefined);
  const [year, setYear] = useState<string>('');
  const [genre, setGenre] = useState<string>('');
  const [searchInput, setSearchInput] = useState<string>('');
  const [filter, setFilter] = useState<string>('');
  const [ratedFilter, setRatedFilter] = useState<RatedFilter>('all');
  const [orderBy, setOrderBy] = useState<'date' | 'title'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const resetPage = () => {
    if (page !== 1) {
      setPage(1);
      window.document.body.scrollIntoView({ behavior: 'auto' });
    }
  };

  const onSearchSubmit: FormEventHandler = (e) => {
    e.preventDefault();
    setFilter(searchInput.trim());
    resetPage();
  };

  const { entries, isLoading, numberOfPages, numberOfItemsTotal } =
    useSeenHistory({
      page: page,
      mediaType: mediaType,
      year: year.trim() || undefined,
      genre: genre.trim() || undefined,
      filter: filter || undefined,
      onlyWithUserRating: ratedFilter === 'rated' ? true : undefined,
      onlyWithoutUserRating: ratedFilter === 'unrated' ? true : undefined,
      orderBy: orderBy,
      sortOrder: sortOrder,
    });

  return (
    <>
      <div className="flex justify-center w-full">
        <div className="flex flex-row flex-wrap items-grid">
          <div className="mb-1 header">
            <form
              onSubmit={onSearchSubmit}
              className="flex justify-center w-full mb-2"
            >
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.currentTarget.value)}
                placeholder={t`Filter history`}
                className="w-full"
              />

              <button className="px-4 ml-2 transition-shadow duration-100 hover:shadow hover:shadow-indigo-500/50">
                <Trans>Search</Trans>
              </button>
            </form>

            <div className="flex flex-wrap items-center gap-2 mb-2">
              {mediaTypes.map((type) => (
                <button
                  key={type.label}
                  onClick={() => {
                    setMediaType(type.value);
                    resetPage();
                  }}
                  className={clsx(
                    'px-2 py-1 rounded cursor-pointer select-none',
                    mediaType === type.value
                      ? 'bg-blue-500 text-white'
                      : 'bg-red-500'
                  )}
                >
                  {type.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-2">
              <input
                type="text"
                value={year}
                onChange={(e) => {
                  setYear(e.currentTarget.value);
                  resetPage();
                }}
                placeholder={t`Year`}
                className="w-24"
              />

              <input
                type="text"
                value={genre}
                onChange={(e) => {
                  setGenre(e.currentTarget.value);
                  resetPage();
                }}
                placeholder={t`Genre`}
                className="w-32"
              />

              <select
                value={ratedFilter}
                onChange={(e) => {
                  setRatedFilter(e.currentTarget.value as RatedFilter);
                  resetPage();
                }}
              >
                <option value="all">{t`All`}</option>
                <option value="rated">{t`Rated`}</option>
                <option value="unrated">{t`Unrated`}</option>
              </select>

              <select
                value={orderBy}
                onChange={(e) => {
                  setOrderBy(e.currentTarget.value as 'date' | 'title');
                  resetPage();
                }}
              >
                <option value="date">{t`Date`}</option>
                <option value="title">{t`Title`}</option>
              </select>

              <span
                onClick={() =>
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                }
                className="cursor-pointer select-none material-icons"
              >
                {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
              </span>
            </div>

            {!isLoading && (
              <div>
                <Trans>{numberOfItemsTotal} viewings</Trans>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center w-full">
              <div>
                <Trans>Loading</Trans>
              </div>
            </div>
          ) : (
            <>
              {entries?.length === 0 ? (
                <div className="flex flex-col items-center w-full">
                  <div>
                    <Trans>No history yet</Trans>
                  </div>
                </div>
              ) : (
                entries?.map((entry) => (
                  <HistoryPanel key={entry.id} entry={entry} />
                ))
              )}

              <div className="footer">
                {entries && !isLoading && numberOfPages > 1 && (
                  <Pagination
                    numberOfPages={numberOfPages}
                    page={page}
                    setPage={(value: number) => {
                      setPage(value);
                      window.document.body.scrollIntoView({ behavior: 'auto' });
                    }}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};
