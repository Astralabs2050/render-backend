import {
  Model,
  Table,
  PrimaryKey,
  Column,
  DataType,
  ForeignKey,
  BelongsTo,
  HasMany,
  AllowNull,
  Default,
  BelongsToMany,
} from "sequelize-typescript";
import { v4 as uuidv4 } from "uuid"; // Ensure you import uuidv4
import { CreatorModel as Creator } from "./creator.model";
import { MediaModel } from "./media.model";
import { JobApplicationModel } from "./jobApplication.model";
import { JobApplicationProjects } from "./JobApplicationProjects.model";

@Table({ timestamps: true, tableName: "project" })
export class ProjectModel extends Model {
  
  @PrimaryKey
  @Default(uuidv4) // Automatically generate a UUID for new records
  @Column(DataType.UUID)
 id: string = uuidv4();

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
  projectDescription?: string;

  @BelongsToMany(() => JobApplicationModel, () => JobApplicationProjects)
  jobApplications!: JobApplicationModel[];

  @AllowNull(true)
  @Column(DataType.JSON)
  tags?: string[];

  @HasMany(() => MediaModel, {
    foreignKey: "projectId", // This will link to the project
    as: "media", // More intuitive naming for multiple media items
  })
  images?: MediaModel[]; // This will hold multiple media items
}
