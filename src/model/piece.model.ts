import {
  Model,
  Table,
  PrimaryKey,
  Column,
  DataType,
  ForeignKey,
  BelongsTo,
  Default,
  HasMany,
} from "sequelize-typescript";
import { v4 as uuidv4 } from "uuid";
import { DesignModel } from "./design.model";
import { MediaModel } from "./media.model";

enum creatorType {
  digital = "digital",
  physical = "physical",
}

@Table({ timestamps: true, tableName: "pieces" }) // Updated table name to "pieces"
export class PieceModel extends Model {
  @PrimaryKey
  @Default(uuidv4)
  @Column(DataType.UUID)
  id!: string;

  @ForeignKey(() => DesignModel)
  @Column(DataType.UUID)
  designId!: string;

  @BelongsTo(() => DesignModel, {
    foreignKey: "designId",
    as: "design",
    onDelete: "CASCADE",
  })
  design!: DesignModel;

  @Column(DataType.STRING)
  pieceType?: string;

  @Column(DataType.INTEGER)
  designNumber?: number;

  @Column(DataType.FLOAT)
  piecePrice?: number;

  @Column(DataType.FLOAT)
  modelingPrice?: number;

  @HasMany(() => MediaModel, {
    foreignKey: "pieceId", // This will link to the project
    as: "media", // More intuitive naming for multiple media items
  })
  images?: MediaModel[]; // This will hold multiple media items
}
