import {
  Model,
  Table,
  PrimaryKey,
  Column,
  DataType,
  AllowNull,
  Default,
  Index,
  ForeignKey,
  BelongsTo,
} from "sequelize-typescript";
import { v4 as uuidv4 } from "uuid";
import { UsersModel as User } from "./user.model"; // Assuming you have a User model

@Table({ timestamps: true, tableName: "analysis" })
export class AnalysisModel extends Model {
  @PrimaryKey
  @Default(uuidv4) // Generate a default UUID
  @Column(DataType.UUID)
  id!: string; // Use non-initialized field syntax

  @AllowNull(false)
  @Column(DataType.FLOAT)
  totalSales!: number;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  totalOrder!: number;

  @AllowNull(false)
  @Column(DataType.FLOAT)
  impression!: number;

  @ForeignKey(() => User)
  @AllowNull(false) // Ensure foreign key is not null
  @Column(DataType.UUID)
  userId!: string;

  @BelongsTo(() => User, {
    foreignKey: "userId",
    as: "user",
    onDelete: "CASCADE",
  })
  user!: User;
}
