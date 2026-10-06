import React, { FunctionComponent } from 'react';
import { parseISO } from 'date-fns';
import { plural, t, Trans } from '@lingui/macro';

import {
  MediaItemItemsResponse,
  MediaType,
  SeenHistoryEntry,
  TvEpisode,
  TvSeason,
} from 'mediatracker-api';
import { Poster } from 'src/components/Poster';
import { BadgeRating } from 'src/components/StarRating';
import { Item } from 'src/components/GridItem';
import { Confirm } from 'src/components/Confirm';
import { markAsUnseen } from 'src/api/details';
import { formatEpisodeNumber } from 'src/utils';
import {
  isAudiobook,
  isBook,
  isMovie,
  isTvShow,
  isVideoGame,
} from 'src/utils';

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
          {mediaItem.mediaType === 'tv' ? (
            <a
              className="absolute inline-flex pointer-events-auto foo right-1 top-1 hover:no-underline"
              href={`#/seasons/${mediaItem.id}`}
            >
              {mediaItem.firstUnwatchedEpisode && (
                <Item>
                  {formatEpisodeNumber(
                    mediaItem.firstUnwatchedEpisode as unknown as TvEpisode
                  )}
                </Item>
              )}
              {mediaItem.unseenEpisodesCount > 0 && (
                <Item>{mediaItem.unseenEpisodesCount}</Item>
              )}
              {mediaItem.seen == true && (
                <Item>
                  <i className="flex text-white material-icons hover:text-yellow-600">
                    check_circle_outline
                  </i>
                </Item>
              )}
            </a>
          ) : (
            <>
              {mediaItem.seen == true && (
                <div className="absolute inline-flex pointer-events-auto foo right-1 top-1">
                  <Item>
                    <i className="flex text-white select-none material-icons">
                      check_circle_outline
                    </i>
                  </Item>
                </div>
              )}
            </>
          )}
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

export const RemoveSeenEntryButton: FunctionComponent<{
  entry: SeenHistoryEntry;
}> = (props) => {
  const { entry } = props;
  const { mediaItem, episode } = entry;
  const mediaItemProp = entry.mediaItem as unknown as MediaItemItemsResponse;
  const mediaType = mediaItem.mediaType as MediaType;

  return (
    <div
      className="text-sm btn-red"
      onClick={async () =>
        (await Confirm(
          plural(1, {
            one: 'Do you want to remove # seen history entry?',
            other: 'Do you want to remove all # seen history entries?',
          })
        )) &&
        markAsUnseen({
          mediaItem: mediaItemProp,
          seenId: entry.id,
        })
      }
    >
      {episode ? (
        <Trans>Marcar como no visto</Trans>
      ) : isMovie(mediaType) ? (
        <Trans>Marcar como no vista</Trans>
      ) : isBook(mediaType) ? (
        <Trans>Marcar como no leído</Trans>
      ) : isVideoGame(mediaType) ? (
        <Trans>Marcar como no jugado</Trans>
      ) : isAudiobook(mediaType) ? (
        <Trans>Marcar como no escuchado</Trans>
      ) : isTvShow(mediaType) ? (
        <Trans>Marcar como no vista</Trans>
      ) : (
        <Trans>Marcar como no visto</Trans>
      )}
    </div>
  );
};
