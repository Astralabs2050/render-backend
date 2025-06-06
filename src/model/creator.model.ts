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
} from "sequelize-typescript";
import { UsersModel as User } from "./user.model";
import { WorkExperienceModel } from "./workExperience.model";
import { ProjectModel } from "./project.model";
import { v4 as uuidv4 } from "uuid";
import { MediaModel } from "./media.model";

enum creatorType {
  digital = "digital",
  physical = "physical",
}

@Table({ timestamps: true, tableName: "creators" })
export class CreatorModel extends Model {
  @PrimaryKey
  @Default(uuidv4) // Ensures a UUID is generated by default
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

  @AllowNull(true)
  @Column(DataType.STRING)
  fullName?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  location?: string;

  @AllowNull(true)
  @Column(DataType.JSON) // Use JSON type for multiple categories
  category?: string[];

  @AllowNull(true)
  @Column(DataType.JSON) // Use JSON type for multiple skills
  skills?: string[];

  @AllowNull(true)
  @Column(DataType.ENUM(...Object.values(creatorType)))
  creatorType?: creatorType;

  @HasMany(() => WorkExperienceModel, {
    foreignKey: "creatorId",
    as: "workExperiences",
    onDelete: "CASCADE", // Ensure cascade delete
  })
  workExperiences!: WorkExperienceModel[];

  @HasMany(() => ProjectModel, {
    foreignKey: "creatorId",
    as: "projects", // Use consistent alias
    onDelete: "CASCADE", // Ensure cascade delete
  })
  projects!: ProjectModel[];
}
