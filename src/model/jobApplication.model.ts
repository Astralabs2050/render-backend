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
import { JobApplicationProjects } from "./JobApplicationProjects.model";

@Table({ timestamps: true, tableName: "job_applications" })
export class JobApplicationModel extends Model {
  
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

  @Column(DataType.INTEGER)
  amount!: number;

  @Default(false)
  @Column(DataType.BOOLEAN)
  status!: boolean;

  @Default(false)
  @Column(DataType.BOOLEAN)
  negotiation!: boolean;

  @AllowNull(false) // Ensures description cannot be null
  @Column(DataType.TEXT)
  wallet!: string;

  @Column(DataType.INTEGER)
  minAmount!: number;

  @BelongsTo(() => UsersModel, {
    foreignKey: "userId",
    as: "user",
    onDelete: "CASCADE",
  })
  user!: UsersModel;

  // Define the many-to-many relationship with Project
  @BelongsToMany(() => ProjectModel, () => JobApplicationProjects)
  projects!: ProjectModel[];
}
