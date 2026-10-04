import React, { FunctionComponent, useState } from 'react';
import clsx from 'clsx';
import { Trans } from '@lingui/macro';

import { MediaItemItemsResponse, TvEpisode, TvSeason } from 'mediatracker-api';
import { setRating } from 'src/api/details';
import { Modal, useOpenModalRef } from 'src/components/Modal';
import { SelectSeenDate } from 'src/components/SelectSeenDate';
import { formatEpisodeNumber, formatSeasonNumber } from 'src/utils';
import { queryClient } from 'src/App';

const STARS = 5;

const valueForStar = (index: number, firstHalf: boolean): number =>
  index * 2 + (firstHalf ? 1 : 2);

const iconForStar = (
  shown: number | undefined,
  index: number
): 'star' | 'star_half' | 'star_border' => {
  const value = shown ?? 0;

  if (value >= index * 2 + 2) {
    return 'star';
  }

  if (value >= index * 2 + 1) {
    return 'star_half';
  }

  return 'star_border';
};

const StarsInput: FunctionComponent<{
  rating?: number;
  sizeClass?: string;
  onSelect: (value: number) => void;
}> = (props) => {
  const { rating, sizeClass, onSelect } = props;
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const shown = hoverValue ?? rating;

  return (
    <span className="flex cursor-pointer w-min">
      {new Array(STARS).fill(null).map((value, index) => {
        const icon = iconForStar(shown, index);

        return (
          <span
            key={index}
            className="relative"
            onPointerLeave={() => setHoverValue(null)}
          >
            <span
              className={clsx(
                'material-icons hover:text-yellow-400 select-none',
                sizeClass,
                {
                  'text-yellow-400': icon !== 'star_border',
                }
              )}
            >
              {icon}
            </span>

            <span
              className="absolute inset-y-0 left-0 w-1/2"
              onClick={(e) => {
                e.preventDefault();
                onSelect(valueForStar(index, true));
              }}
              onPointerEnter={() => setHoverValue(valueForStar(index, true))}
            />

            <span
              className="absolute inset-y-0 right-0 w-1/2"
              onClick={(e) => {
                e.preventDefault();
                onSelect(valueForStar(index, false));
              }}
              onPointerEnter={() => setHoverValue(valueForStar(index, false))}
            />
          </span>
        );
      })}
    </span>
  );
};

export const StarRating: FunctionComponent<
  | { mediaItem: MediaItemItemsResponse }
  | { mediaItem: MediaItemItemsResponse; season: TvSeason }
  | { mediaItem: MediaItemItemsResponse; episode: TvEpisode }
> = (props) => {
  const { mediaItem, season, episode } = {
    season: undefined,
    episode: undefined,
    ...props,
  };
  const rating: number = episode
    ? episode.userRating?.rating
    : season
    ? season.userRating?.rating
    : mediaItem.userRating?.rating;

  const _setRating = (value: number) =>
    setRating({
      mediaItem: mediaItem,
      season: season,
      episode: episode,
      rating: value,
    });

  return <StarsInput rating={rating} onSelect={_setRating} />;
};

const StarRatingModal: FunctionComponent<
  { closeModal: (rating?: number) => void } & (
    | { mediaItem: MediaItemItemsResponse }
    | { mediaItem: MediaItemItemsResponse; season: TvSeason }
    | { mediaItem: MediaItemItemsResponse; episode: TvEpisode }
  )
> = (props) => {
  const { closeModal, mediaItem, season, episode } = {
    season: undefined,
    episode: undefined,
    ...props,
  };

  const rating: number = episode
    ? episode.userRating?.rating
    : season
    ? season.userRating?.rating
    : mediaItem.userRating?.rating;

  const [review, setReview] = useState(    (episode
      ? episode.userRating?.review
      : season
      ? season.userRating?.review
      : mediaItem.userRating?.review) || ''
  );

  const onSetRating = async (value?: number) => {
    setRating({
      mediaItem: mediaItem,
      season: season,
      episode: episode,
      rating: value,
    });
  };

  const _closeModal = () => {
    closeModal();
    queryClient.invalidateQueries(['items']);
    queryClient.invalidateQueries(['list']);
  };

  return (
    <div className="flex flex-col items-center justify-center p-3 text-black select-none bottom-full min-w-max w-96">
      <div className="pb-2 text-4xl font-bold">
        {mediaItem.title}
        {season && <> {formatSeasonNumber(season)}</>}
        {episode && <> {formatEpisodeNumber(episode)}</>}
      </div>

      <span className="flex px-1 m-auto cursor-pointer w-min dark:text-slate-200">
        <StarsInput
          rating={rating}
          sizeClass="text-2xl"
          onSelect={(value) => {
            if (value === rating) {
              onSetRating(null);
            } else {
              onSetRating(value);
            }
          }}
        />
      </span>
      <form
        className="w-full mt-4"
        onSubmit={async (e) => {
          e.preventDefault();
          _closeModal();

          await setRating({
            mediaItem: mediaItem,
            season: season,
            episode: episode,
            review: review,
          });
        }}
      >
        <textarea
          className="w-full resize-none h-80"
          value={review}
          onChange={(e) => setReview(e.currentTarget.value)}
        />
        <div className="flex w-full">
          <button className="btn-blue">
            <Trans>Save review</Trans>
          </button>
          <div className="ml-auto btn-red" onClick={() => _closeModal()}>
            <Trans>Cancel</Trans>
          </div>
        </div>
      </form>
    </div>
  );
};

export const BadgeRating: FunctionComponent<
  | { mediaItem: MediaItemItemsResponse }
  | { mediaItem: MediaItemItemsResponse; season: TvSeason }
  | { mediaItem: MediaItemItemsResponse; episode: TvEpisode }
> = (props) => {
  const { mediaItem, season, episode } = {
    season: undefined,
    episode: undefined,
    ...props,
  };

  const rating: number = episode
    ? episode.userRating?.rating
    : season
    ? season.userRating?.rating
    : mediaItem.userRating?.rating;

  const seen = episode
    ? episode.seen === true
    : season
    ? season.seen === true
    : mediaItem.seen === true;

  const openModal2 = useOpenModalRef();

  return (
    <>
      <Modal
        onBeforeClosed={(e) => e && !seen && openModal2.current.open()}
        openModal={(openModal) => (
          <>
            <span
              className="flex w-min px-0.5 bg-gray-400 rounded shadow-lg cursor-pointer text-lg relative text-black select-none"
              onClick={() => openModal()}
            >
              <span
                className={clsx([
                  'material-icons hover:text-yellow-400',
                  rating && 'text-yellow-400',
                ])}
              >
                star
              </span>
              {rating && <span className="px-0.5 font-bold">{rating}</span>}
            </span>

            <Modal openModalRef={openModal2}>
              {(closeModal) => (
                <>
                  <SelectSeenDate
                    closeModal={closeModal}
                    mediaItem={mediaItem}
                    season={season}
                    episode={episode}
                  />
                </>
              )}
            </Modal>
          </>
        )}
      >
        {(closeModal) => (
          <StarRatingModal
            mediaItem={mediaItem}
            season={season}
            episode={episode}
            closeModal={closeModal}
          />
        )}
      </Modal>
    </>
  );
};
