import {
  Model,
  Table,
  PrimaryKey,
  Column,
  DataType,
  Default,
  HasMany,
  AllowNull,
  ForeignKey,
  BelongsTo,
} from "sequelize-typescript";
import { v4 as uuidv4 } from "uuid";

@Table({ timestamps: true, tableName: "waitlist" })
export class Waitlist extends Model {
  @PrimaryKey
  @Default(uuidv4) // Generates a unique UUID for each record
  @Column(DataType.UUID)
  id: string = uuidv4();

  @AllowNull(false) // Ensures description cannot be null
  @Column(DataType.STRING)
  fullName!: string;

  @AllowNull(false) // Ensures description cannot be null
  @Column(DataType.STRING)
  email!: string;

  @AllowNull(false) // Ensures description cannot be null
  @Column(DataType.TEXT)
  make!: string;

  @AllowNull(false) // Ensures description cannot be null
  @Column(DataType.TEXT)
  link!: string;

  @AllowNull(false) // Ensures description cannot be null
  @Column(DataType.STRING)
  occasion!: string;
}
