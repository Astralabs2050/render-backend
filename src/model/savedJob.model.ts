import {
  Model,
  Table,
  PrimaryKey,
  Column,
  DataType,
  Default,
  AllowNull,
  ForeignKey,
  BelongsTo,
  BelongsToMany,
} from "sequelize-typescript";
import { v4 as uuidv4 } from "uuid";
import { JobModel } from "./job.model";
import { UsersModel } from "./user.model";
import { ProjectModel } from "./project.model";

@Table({ timestamps: true, tableName: "saved_jobs" })
export class SavedJobsModel extends Model {
  
  @PrimaryKey
  @Default(uuidv4)
  @Column(DataType.UUID)
  id: string = uuidv4();

  @AllowNull(false)
  @ForeignKey(() => JobModel)
  @Column(DataType.UUID)
  jobId!: string;

  @BelongsTo(() => JobModel, {
    foreignKey: "jobId",
    as: "job",
    onDelete: "CASCADE",
  })
  job!: JobModel;

  @AllowNull(false)
  @ForeignKey(() => UsersModel)
  @Column(DataType.UUID)
  userId!: string;

  @BelongsTo(() => UsersModel, {
    foreignKey: "userId",
    as: "user",
    onDelete: "CASCADE",
  })
  user?: UsersModel;
}
