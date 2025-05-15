import {
  Model,
  Table,
  PrimaryKey,
  Column,
  DataType,
  AllowNull,
  ForeignKey,
  BelongsTo,
  Default,
} from "sequelize-typescript";
import { v4 as uuidv4 } from "uuid";
import { UsersModel as User } from "./user.model";
import { ProjectModel } from "./project.model";
import { CreatorModel } from "./creator.model";
import { PieceModel } from "./piece.model";
import { DesignModel } from "./design.model";
import { CollectionModel } from "./collection.model";

@Table({ timestamps: true, tableName: "media" })
export class MediaModel extends Model {
  @PrimaryKey
  @Default(uuidv4)
  @Column(DataType.UUID)
  id: string = uuidv4();

  @Column(DataType.TEXT)
  link!: string;

  @Column(DataType.STRING)
  mediaType!: string;

  @AllowNull(true)
  @ForeignKey(() => User)
  @Column(DataType.UUID)
  userId?: string;

  @BelongsTo(() => User, {
    foreignKey: "userId",
    as: "user",
    onDelete: "CASCADE",
  })
  user?: User;

  @AllowNull(true)
  @ForeignKey(() => DesignModel)
  @Column(DataType.UUID)
  designId?: string; // Updated to designId

  @BelongsTo(() => DesignModel, {
    foreignKey: "designId", // Updated foreign key
    as: "design",
    onDelete: "CASCADE",
  })
  design?: DesignModel;


  @AllowNull(true)
  @ForeignKey(() => CollectionModel)
  @Column(DataType.UUID)
  collectionId?: string;

  @BelongsTo(() => CollectionModel, {
    foreignKey: "collectionId",
    as: "collection",
    onDelete: "CASCADE",
  })
  collection?: ProjectModel;

  @AllowNull(true)
  @ForeignKey(() => ProjectModel)
  @Column(DataType.UUID)
  projectId?: string;

  @BelongsTo(() => ProjectModel, {
    foreignKey: "projectId",
    as: "project",
    onDelete: "CASCADE",
  })
  project?: ProjectModel;

  @AllowNull(true)
  @ForeignKey(() => PieceModel)
  @Column(DataType.UUID)
  pieceId?: string;

  @BelongsTo(() => PieceModel, {
    foreignKey: "pieceId",
    as: "piece",
    onDelete: "CASCADE",
  })
  piece?: PieceModel;
}
