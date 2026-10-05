import { Knex } from 'knex';

/**
 * Books stored by OpenLibrary search never fetched their full details:
 * search results did not set needsDetails, so opening the details page
 * never triggered updateMediaItem (unlike TMDB results).
 *
 * Flag existing OpenLibrary books without the flag so their metadata
 * (overview, full release date, genres) loads on next details view.
 */
export async function up(knex: Knex): Promise<void> {
  await knex('mediaItem')
    .update({ needsDetails: true })
    .where({ mediaType: 'book', source: 'openlibrary' })
    .whereNull('needsDetails');
}

export async function down(knex: Knex): Promise<void> {
  return;
}
