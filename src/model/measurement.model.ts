import {
  Model,
  Table,
  PrimaryKey,
  Column,
  DataType,
  ForeignKey,
  BelongsTo,
  AllowNull,
  Default,
  BeforeCreate,
  BeforeUpdate,
} from "sequelize-typescript";
import { UsersModel as User } from "./user.model";
import { v4 as uuidv4 } from "uuid";

@Table({ timestamps: true, tableName: "measurement" })
export class MeasurementModel extends Model {
  @PrimaryKey
  @Default(uuidv4)
  @Column(DataType.UUID)
  id: string = uuidv4();

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  userId!: string;

  @BelongsTo(() => User, {
    foreignKey: "userId",
    as: "user",
    onDelete: "CASCADE", // Ensure cascade delete
  })
  user!: User;

  @AllowNull(false)
  @Column(DataType.STRING)
  region?: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  pieceType?: string;

  // Shirt measurements
  @Column(DataType.INTEGER)
  collarSize?: number; // Collar size for shirts

  @Column(DataType.INTEGER)
  sleeveLength?: number; // Sleeve length for shirts

  @Column(DataType.INTEGER)
  chestSize?: number; // Chest size for shirts

  @Column(DataType.INTEGER)
  waistSizeShirt?: number; // Waist size for shirts

  @Column(DataType.INTEGER)
  shirtLength?: number; // Shirt length

  // Trouser measurements
  @Column(DataType.INTEGER)
  waistSize?: number; // Waist size for trousers

  @Column(DataType.INTEGER)
  inseamLength?: number; // Inseam length for trousers

  @Column(DataType.INTEGER)
  hipSize?: number; // Hip size for trousers

  @Column(DataType.INTEGER)
  thighSize?: number; // Thigh size for trousers

  @Column(DataType.INTEGER)
  trouserLength?: number; // Trouser length

  // Validation logic for ensuring measurements based on pieceType

  static validateMeasurement(model: MeasurementModel) {
    // Ensure all required fields are filled based on pieceType
    if (model.pieceType === "shirt") {
      if (
        model.collarSize === undefined ||
        model.sleeveLength === undefined ||
        model.chestSize === undefined ||
        model.waistSizeShirt === undefined ||
        model.shirtLength === undefined
      ) {
        throw new Error(
          "All shirt measurements (collarSize, sleeveLength, chestSize, waistSizeShirt, shirtLength) are required.",
        );
      }
    } else if (model.pieceType === "trouser") {
      if (
        model.waistSize === undefined ||
        model.inseamLength === undefined ||
        model.hipSize === undefined ||
        model.thighSize === undefined ||
        model.trouserLength === undefined
      ) {
        throw new Error(
          "All trouser measurements (waistSize, inseamLength, hipSize, thighSize, trouserLength) are required.",
        );
      }
    } else {
      throw new Error(
        "Invalid pieceType. Only 'shirt' or 'trouser' are allowed.",
      );
    }
  }
}
