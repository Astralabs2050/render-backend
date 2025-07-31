import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get('DATABASE_URL');
 
        const config = databaseUrl ? {
          type: 'postgres' as const,
          url: databaseUrl,
          ssl: {
            rejectUnauthorized: false,
          },
        } : {
          type: 'postgres' as const,
          host: configService.get('DB_HOST'),
          port: parseInt(configService.get('DB_PORT', '5432')),
          username: configService.get('DB_USERNAME'),
          password: configService.get('DB_PASSWORD'),
          database: configService.get('DB_DATABASE'),
          ssl: {
            rejectUnauthorized: false,
          },
        };
        return {
          ...config,
          entities: [__dirname + '/../**/*.entity{.ts,.js}'],
          synchronize: process.env.NODE_ENV !== 'production',
          logging: false,
          maxQueryExecutionTime: 1000,
          cache: false,
          extra: {
            max: 5,
            connectionTimeoutMillis: 5000,
            idleTimeoutMillis: 10000
          }
        };
      },
    }),
  ],
})
export class DatabaseModule {}
