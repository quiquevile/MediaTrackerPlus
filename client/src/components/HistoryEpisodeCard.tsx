import React, { FunctionComponent } from 'react';
import { parseISO } from 'date-fns';
import { t } from '@lingui/macro';

import {
  MediaItemItemsResponse,
  MediaType,
  SeenHistoryEntry,
  TvEpisode,
  TvSeason,
} from 'mediatracker-api';
import { Poster } from 'src/components/Poster';
import { BadgeRating } from 'src/components/StarRating';
import { formatEpisodeNumber } from 'src/utils';

const mediaTypeString: Record<string, string> = {
  audiobook: t`Audiobook`,
  book: t`Book`,
  movie: t`Movie`,
  tv: t`Tv`,
  video_game: t`Video game`,
};

export const HistoryEpisodeCard: FunctionComponent<{
  entry: SeenHistoryEntry;
}> = (props) => {
  const { entry } = props;
  const { mediaItem, episode, season } = entry;

  const mediaItemProp = entry.mediaItem as unknown as MediaItemItemsResponse;
  const episodeProp = episode as unknown as TvEpisode;
  const seasonProp = season as unknown as TvSeason;

  return (
    <div className="item">
      <div className="pb-4">
        <Poster
          src={mediaItem.posterSmall}
          itemMediaType={mediaItem.mediaType as MediaType}
          href={`#/details/${mediaItem.id}`}
        >
          <div className="absolute pointer-events-auto bottom-1 left-1">
            <div className="flex gap-1">
              <BadgeRating mediaItem={mediaItemProp} />

              {season && (
                <BadgeRating
                  mediaItem={mediaItemProp}
                  season={seasonProp}
                  starClass="text-indigo-600"
                />
              )}

              {episode && (
                <BadgeRating
                  mediaItem={mediaItemProp}
                  episode={episodeProp}
                  starClass="text-green-600 dark:text-green-400"
                />
              )}
            </div>
          </div>
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
              {formatEpisodeNumber(episodeProp)} {episode.title}
            </div>
          )}

          <div className="overflow-hidden overflow-ellipsis whitespace-nowrap">
            {entry.date ? new Date(entry.date).toLocaleString() : null}
          </div>
        </div>
      </div>
    </div>
  );
};
