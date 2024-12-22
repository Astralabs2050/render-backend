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

@Table({ timestamps: true, tableName: "sales" })
export class SalestModel extends Model {
  @PrimaryKey
  @Default(uuidv4)
  @Column(DataType.UUID)
  id!: string;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  creatorId!: string;

  @BelongsTo(() => User, {
    foreignKey: "userId",
    as: "creator",
    onDelete: "CASCADE",
  })
  creator!: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  branId!: string;

  @BelongsTo(() => User, {
    foreignKey: "userId",
    as: "brand",
    onDelete: "CASCADE",
  })
  brand!: User;
}
