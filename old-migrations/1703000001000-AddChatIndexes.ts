import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

export class AddChatIndexes1703000001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Composite index for chat access validation
    await queryRunner.createIndex(
      'chats',
      new TableIndex({ name: 'IDX_chats_access', columnNames: ['creatorId', 'makerId'] })
    );

    // Index for message queries
    await queryRunner.createIndex(
      'messages',
      new TableIndex({ name: 'IDX_messages_chat_created', columnNames: ['chatId', 'createdAt'] })
    );

    // Index for unread message counts
    await queryRunner.createIndex(
      'messages',
      new TableIndex({ name: 'IDX_messages_unread', columnNames: ['chatId', 'senderId', 'isRead'] })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('messages', 'IDX_messages_unread');
    await queryRunner.dropIndex('messages', 'IDX_messages_chat_created');
    await queryRunner.dropIndex('chats', 'IDX_chats_access');
  }
}