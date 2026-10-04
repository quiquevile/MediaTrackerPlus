import React, { FunctionComponent } from 'react';
import clsx from 'clsx';
import { t, Trans } from '@lingui/macro';
import { parseISO } from 'date-fns';

import { MediaType, SeenHistoryEntry, TvEpisode } from 'mediatracker-api';
import { Poster } from 'src/components/Poster';
import { formatEpisodeNumber } from 'src/utils';

const mediaTypeString: Record<string, string> = {
  audiobook: t`Audiobook`,
  book: t`Book`,
  movie: t`Movie`,
  tv: t`Tv`,
  video_game: t`Video game`,
};

export const HistoryPanel: FunctionComponent<{
  entry: SeenHistoryEntry;
}> = (props) => {
  const { entry } = props;
  const { mediaItem, episode } = entry;

  return (
    <div className="item">
      <div className="pb-4">
        <Poster
          src={mediaItem.posterSmall}
          itemMediaType={mediaItem.mediaType as MediaType}
          href={`#/details/${mediaItem.id}`}
        >
          {mediaItem.userRating != null && (
            <div className="absolute pointer-events-auto bottom-1 left-1">
              <span className="flex w-min px-0.5 bg-gray-400 rounded shadow-lg text-lg relative text-black select-none">
                <span className="material-icons text-yellow-400">star</span>
                <span className="px-0.5 font-bold">
                  {mediaItem.userRating}
                </span>
              </span>
            </div>
          )}
        </Poster>

        <div className="mt-1 overflow-hidden whitespace-nowrap text-ellipsis">
          <div className="flex justify-between text-gray-500 dark:text-gray-400">
            <span>
              {mediaItem.releaseDate &&
                parseISO(mediaItem.releaseDate).getFullYear()}
            </span>

            <span>{mediaTypeString[mediaItem.mediaType]}</span>
          </div>

          <div className="overflow-hidden text-lg overflow-ellipsis whitespace-nowrap">
            {mediaItem.title}
          </div>

          {episode && (
            <div className="overflow-hidden overflow-ellipsis whitespace-nowrap">
              {formatEpisodeNumber(episode as unknown as TvEpisode)}{' '}
              {episode.title}
            </div>
          )}

          <div
            className={clsx(
              'overflow-hidden overflow-ellipsis whitespace-nowrap',
              !entry.date && 'italic'
            )}
          >
            {entry.date ? (
              new Date(entry.date).toLocaleString()
            ) : (
              <Trans>No date</Trans>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
