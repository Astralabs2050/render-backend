import {
  Model,
  Table,
  ForeignKey,
  Column,
  DataType,
} from "sequelize-typescript";
import { JobApplicationModel } from "./jobApplication.model";
import { ProjectModel } from "./project.model";

@Table({ tableName: "job_application_projects" })
export class JobApplicationProjects extends Model {
  @ForeignKey(() => JobApplicationModel)
  @Column(DataType.UUID)
  jobApplicationId!: string;

  @ForeignKey(() => ProjectModel)
  @Column(DataType.UUID)
  projectId!: string;
}
