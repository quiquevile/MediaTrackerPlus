import React, { FormEventHandler, FunctionComponent, useState } from 'react';
import { t, Trans } from '@lingui/macro';

import { MediaType } from 'mediatracker-api';
import { useSeenHistory, useSeenHistoryFacets } from 'src/api/history';
import { HistoryPanel } from 'src/components/HistoryPanel';
import { MultiSelect } from 'src/components/MultiSelect';
import { Pagination } from 'src/components/PaginatedGridItems';
import { Toggle } from 'src/components/Toggle';

const mediaTypes: { value: MediaType; label: string }[] = [
  { value: 'movie', label: t`Movies` },
  { value: 'tv', label: t`Tv` },
  { value: 'video_game', label: t`Games` },
  { value: 'book', label: t`Books` },
  { value: 'audiobook', label: t`Audiobooks` },
];

type RatedFilter = 'all' | 'rated' | 'unrated';

export const HistoryPage: FunctionComponent = () => {
  const [page, setPage] = useState<number>(1);
  const [activeMediaTypes, setActiveMediaTypes] = useState<MediaType[]>([]);
  const [viewedYears, setViewedYears] = useState<string[]>([]);
  const [releaseYears, setReleaseYears] = useState<string[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
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

  const onClearFilters = () => {
    setActiveMediaTypes([]);
    setViewedYears([]);
    setReleaseYears([]);
    setGenres([]);
    setSearchInput('');
    setFilter('');
    setRatedFilter('all');
    setOrderBy('date');
    setSortOrder('desc');
    resetPage();
  };

  const toggleMediaType = (value: MediaType, checked: boolean) => {
    if (checked) {
      setActiveMediaTypes([...activeMediaTypes, value]);
    } else {
      setActiveMediaTypes(activeMediaTypes.filter((item) => item !== value));
    }

    resetPage();
  };

  const { entries, isLoading, numberOfPages, numberOfItemsTotal } =
    useSeenHistory({
      page: page,
      mediaTypes:
        activeMediaTypes.length > 0 ? activeMediaTypes.join(',') : undefined,
      viewedYears: viewedYears.length > 0 ? viewedYears.join(',') : undefined,
      releaseYears:
        releaseYears.length > 0 ? releaseYears.join(',') : undefined,
      genres: genres.length > 0 ? genres.join(',') : undefined,
      filter: filter || undefined,
      onlyWithUserRating: ratedFilter === 'rated' ? true : undefined,
      onlyWithoutUserRating: ratedFilter === 'unrated' ? true : undefined,
      orderBy: orderBy,
      sortOrder: sortOrder,
    });

  const {
    viewedYears: facetViewedYears,
    releaseYears: facetReleaseYears,
    genres: facetGenres,
  } = useSeenHistoryFacets();

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

              <button
                type="button"
                onClick={onClearFilters}
                className="px-4 ml-2 transition-shadow duration-100 hover:shadow hover:shadow-indigo-500/50"
              >
                <Trans>Clear</Trans>
              </button>
            </form>

            <div className="flex flex-wrap items-center gap-2 mb-2">
              {mediaTypes.map((type) => (
                <Toggle
                  key={type.value}
                  label={type.label}
                  checked={activeMediaTypes.includes(type.value)}
                  onChange={(checked) => toggleMediaType(type.value, checked)}
                />
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-2">
              <MultiSelect
                label={t`Seen year`}
                values={facetViewedYears}
                selected={viewedYears}
                onChange={(selected) => {
                  setViewedYears(selected);
                  resetPage();
                }}
              />

              <MultiSelect
                label={t`Year`}
                values={facetReleaseYears}
                selected={releaseYears}
                onChange={(selected) => {
                  setReleaseYears(selected);
                  resetPage();
                }}
              />

              <MultiSelect
                label={t`Genre`}
                values={facetGenres}
                selected={genres}
                onChange={(selected) => {
                  setGenres(selected);
                  resetPage();
                }}
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
