import {
  Model,
  Table,
  PrimaryKey,
  Column,
  DataType,
  ForeignKey,
  BelongsTo,
  Default,
} from "sequelize-typescript";
import { CreatorModel as Creator } from "./creator.model"; // Adjust the path as necessary
import { v4 as uuidv4 } from "uuid";

@Table({ timestamps: true, tableName: "work_experiences" })
export class WorkExperienceModel extends Model {
  @PrimaryKey
  @Default(uuidv4)
  @Column(DataType.UUID)
  id!: string;

  @ForeignKey(() => Creator)
  @Column(DataType.UUID)
  creatorId!: string;

  @BelongsTo(() => Creator, {
    foreignKey: "creatorId",
    as: "creator",
    onDelete: "CASCADE",
  })
  creator!: Creator;

  @Column(DataType.STRING)
  title!: string;

  @Column(DataType.STRING)
  description!: string;

  @Column(DataType.STRING)
  companyName!: string;

  @Column(DataType.DATE)
  startYear!: Date;

  @Column(DataType.DATE)
  startMonth!: Date;

  @Column(DataType.DATE)
  endYear!: Date;

  @Column(DataType.DATE)
  endMonth!: Date;
}
