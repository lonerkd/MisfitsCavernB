import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client as Pg } from 'pg';

let db: Pg;

const supersededIndexes = [
  'character_castings_character_idx',
  'scene_characters_character_idx',
  'scene_states_character_idx',
  'scenes_location_idx',
  'scenes_shoot_day_idx',
  'breakdown_elements_category_idx',
  'idx_call_sheet_calls_sheet',
  'character_media_media_idx',
  'expenses_budget_item_idx',
  'expenses_vendor_idx',
  'post_cuts_media_idx',
  'post_notes_scene_idx',
  'project_documents_location_idx',
  'scene_elements_element_idx',
  'scene_media_media_idx',
  'set_log_day_idx',
  'set_log_media_idx',
  'set_log_scene_idx',
  'set_log_shot_idx',
  'shots_frame_media_idx',
  'idx_shots_scene',
  'links_to_idx',
];

beforeAll(async () => {
  const connectionString = process.env.SUPABASE_TEST_DB_URL;
  if (!connectionString) throw new Error('SUPABASE_TEST_DB_URL is not set — integration global setup did not run.');
  db = new Pg({ connectionString });
  await db.connect();
});

afterAll(async () => {
  await db.end();
});

describe('foreign-key indexes', () => {
  it('covers every public foreign key with a full leading-key B-tree index', async () => {
    const { rows } = await db.query<{ table_name: string; constraint_name: string; columns: string[] }>(`
      SELECT c.conrelid::regclass::text AS table_name,
             c.conname AS constraint_name,
             ARRAY(
               SELECT a.attname
               FROM unnest(c.conkey) WITH ORDINALITY AS fk(attnum, ordinality)
               JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = fk.attnum
               ORDER BY fk.ordinality
             ) AS columns
      FROM pg_constraint c
      WHERE c.contype = 'f'
        AND c.connamespace = 'public'::regnamespace
        AND NOT EXISTS (
          SELECT 1
          FROM pg_index i
          JOIN pg_class index_relation ON index_relation.oid = i.indexrelid
          JOIN pg_am method ON method.oid = index_relation.relam
          WHERE i.indrelid = c.conrelid
            AND i.indisvalid
            AND i.indpred IS NULL
            AND i.indnkeyatts >= cardinality(c.conkey)
            AND method.amname = 'btree'
            AND (
              SELECT array_agg(key.attnum ORDER BY key.ordinality)
              FROM unnest(i.indkey::smallint[]) WITH ORDINALITY AS key(attnum, ordinality)
              WHERE key.ordinality <= cardinality(c.conkey)
            ) = c.conkey
        )
      ORDER BY table_name, constraint_name
    `);

    expect(rows).toEqual([]);
  });

  it('removes only the superseded non-unique indexes', async () => {
    const { rows } = await db.query<{ index_name: string }>(
      `
        SELECT index_relation.relname AS index_name
        FROM pg_class index_relation
        JOIN pg_namespace schema ON schema.oid = index_relation.relnamespace
        WHERE schema.nspname = 'public'
          AND index_relation.relkind = 'i'
          AND index_relation.relname = ANY($1::text[])
        ORDER BY index_name
      `,
      [supersededIndexes],
    );

    expect(rows.map((row) => row.index_name)).toEqual([]);
  });
});
