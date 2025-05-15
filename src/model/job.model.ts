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
import { DesignModel } from "./design.model";
import { UsersModel } from "./user.model";
import { BrandModel } from "./brand.model";
import { JobApplicationModel } from "./jobApplication.model";

export enum timelineStatus {
  completed = "completed",
  ongoing = "ongoing",
}

@Table({ timestamps: true, tableName: "jobs" })
export class JobModel extends Model {
  @PrimaryKey
  @Default(uuidv4)
  @Column(DataType.UUID)
  id: string = uuidv4();

  @AllowNull(false) // Ensures description cannot be null
  @Column(DataType.TEXT)
  description!: string;

  @Column(DataType.DATE)
  timeline?: Date;

    @AllowNull(true)
    @Column(DataType.STRING)
    escorowId?: string;

  @AllowNull(true)
  @Default(0)
  @Column(DataType.INTEGER)
  impression?: number;

  @Default(false)
  @Column(DataType.BOOLEAN)
  status!: boolean;

  @AllowNull(true)
  @Column(DataType.ENUM(...Object.values(timelineStatus)))
  timelineStatus?: timelineStatus;

  @AllowNull(true)
  @Column(DataType.BOOLEAN)
  manufacturer!: boolean;

  @AllowNull(true)
  @ForeignKey(() => UsersModel)
  @Column(DataType.UUID)
  makerId?: string;

  @BelongsTo(() => UsersModel, {
    foreignKey: "makerId",
    as: "maker", // Define the alias for this association
    onDelete: "SET NULL", // Optional, based on your requirements
  })
  maker?: UsersModel;

  @AllowNull(true)
  @ForeignKey(() => UsersModel)
  @Column(DataType.UUID)
  userId?: string;

  @BelongsTo(() => UsersModel, {
    foreignKey: "userId",
    as: "user",
    onDelete: "CASCADE",
  })
  user?: UsersModel;

  @ForeignKey(() => DesignModel)
  @AllowNull(false) // Ensures foreign key cannot be null
  @Column(DataType.UUID)
  designId!: string;

  @BelongsTo(() => DesignModel, {
    foreignKey: "designId",
    as: "design",
    onDelete: "CASCADE",
  })
  design!: DesignModel;

  // Add the HasMany association for MediaModel
  @HasMany(() => JobApplicationModel, {
    foreignKey: "jobId", // Reference to the user's id in the MediaModel
    as: "job", // Alias for the media association
  })
  job?: JobApplicationModel[];
}
