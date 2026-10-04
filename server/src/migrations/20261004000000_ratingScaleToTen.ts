import { Knex } from 'knex';

/**
 * Rating scale change from 1-5 to 1-10.
 * Existing ratings are doubled so a 4 becomes an 8, etc.
 * userRating.rating is a float column (see 20220121025651_ratingColumnFloat),
 * so no schema change is needed.
 */
export async function up(knex: Knex): Promise<void> {
  await knex('userRating')
    .whereNotNull('rating')
    .update({ rating: knex.raw('rating * 2') });
}

export async function down(knex: Knex): Promise<void> {
  await knex('userRating')
    .whereNotNull('rating')
    .update({ rating: knex.raw('rating / 2') });
}
