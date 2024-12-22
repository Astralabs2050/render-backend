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
import { UsersModel as User } from "./user.model";

@Table({ timestamps: true, tableName: "messages" })
export class MessageModel extends Model {
  
  @Default(uuidv4)
  @Column(DataType.UUID)
  id: string = uuidv4();

  @Column(DataType.TEXT)
  message?: string;

  @Column(DataType.STRING)
  type?: "text" | "image"; // Updated to specify message types

  @Column(DataType.TEXT)
  content?: string; // Generalized content field for both text and image URLs

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  receiverId!: string;

  @Column(DataType.BOOLEAN)
  sent!: boolean;

  @Column(DataType.BOOLEAN)
  seen!: boolean;

  @Column(DataType.DATE)
  readAt?: Date; // Added to track when message is read

  @Default(false) // Ensures default value is applied
  @Column(DataType.BOOLEAN)
  delivered!: boolean;

  @Column(DataType.STRING)
  senderName?: string; // Added to include sender's name

  @BelongsTo(() => User, {
    foreignKey: "receiverId",
    as: "receiver",
    onDelete: "CASCADE",
  })
  receiver!: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  senderId!: string;

  @BelongsTo(() => User, {
    foreignKey: "senderId",
    as: "sender",
    onDelete: "CASCADE",
  })
  sender!: User;
}
