import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `MarkovCorpusEntry` lookups during live learning filter on `markovId` AND `block` together,
 * but the library only indexes each column separately. This composite index lets SQLite
 * satisfy that lookup directly instead of intersecting two single-column indexes.
 */
export class AddCorpusEntryMarkovBlockIndex1786470702000 implements MigrationInterface {
  name = 'AddCorpusEntryMarkovBlockIndex1786470702000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_corpus_entry_markov_block" ON "markov_corpus_entry" ("markovId", "block")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_corpus_entry_markov_block"`);
  }
}
