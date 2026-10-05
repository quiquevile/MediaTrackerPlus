import React, { FunctionComponent, useRef, useState } from 'react';
import clsx from 'clsx';
import { Trans } from '@lingui/macro';

import { MediaItemItemsResponse, TvEpisode, TvSeason } from 'mediatracker-api';
import { setRating } from 'src/api/details';
import { Modal, useOpenModalRef } from 'src/components/Modal';
import { SelectSeenDate } from 'src/components/SelectSeenDate';
import { formatEpisodeNumber, formatSeasonNumber } from 'src/utils';
import { queryClient } from 'src/App';

const STARS = 5;

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
  onSelect: (value: number | null) => void;
}> = (props) => {
  const { rating, sizeClass, onSelect } = props;
  const [previewValue, setPreviewValue] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const rowRef = useRef<HTMLSpanElement>(null);

  // 0 when left of the row or below it (clear zone), else 1..10 by halves.
  const valueFromPosition = (clientX: number, clientY: number): number => {
    const rect = rowRef.current?.getBoundingClientRect();

    if (!rect) {
      return 0;
    }

    if (clientX < rect.left || clientY > rect.bottom + 8) {
      return 0;
    }

    return Math.min(
      STARS * 2,
      Math.max(0, Math.ceil(((clientX - rect.left) / rect.width) * STARS * 2))
    );
  };

  const shown = previewValue ?? rating;

  return (
    <span
      ref={rowRef}
      className="flex cursor-pointer w-min touch-none select-none"
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragging(true);
        setPreviewValue(valueFromPosition(e.clientX, e.clientY));
      }}
      onPointerMove={(e) => {
        if (dragging || e.buttons === 0) {
          setPreviewValue(valueFromPosition(e.clientX, e.clientY));
        }
      }}
      onPointerUp={(e) => {
        if (dragging) {
          const value = valueFromPosition(e.clientX, e.clientY);
          setDragging(false);
          setPreviewValue(null);
          onSelect(value === 0 ? null : value);
        }
      }}
      onPointerCancel={() => {
        setDragging(false);
        setPreviewValue(null);
      }}
      onPointerLeave={() => {
        if (!dragging) {
          setPreviewValue(null);
        }
      }}
    >
      {new Array(STARS).fill(null).map((value, index) => {
        const icon = iconForStar(shown, index);

        return (
          <span key={index} className="relative">
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

  const _setRating = (value?: number) =>
    setRating({
      mediaItem: mediaItem,
      season: season,
      episode: episode,
      rating: value,
    });

  return (
    <StarsInput
      rating={rating}
      onSelect={(value) => {
        if (value === null || value === rating) {
          _setRating(null);
        } else {
          _setRating(value);
        }
      }}
    />
  );
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
            if (value === null || value === rating) {
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
