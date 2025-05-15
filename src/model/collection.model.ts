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
    HasMany,
  } from "sequelize-typescript";
  import { v4 as uuidv4 } from "uuid";
import { DesignModel } from "./design.model";
import { MediaModel } from "./media.model";
import { UsersModel } from "./user.model";

  @Table({ timestamps: true, tableName: "collections" })
  export class CollectionModel extends Model {
    @PrimaryKey
    @Default(uuidv4)
    @Column(DataType.UUID)
    id: string = uuidv4();

    @Column(DataType.INTEGER)
    quantity?: number;

    @Column(DataType.INTEGER)
    price?: number;


    @Column(DataType.TEXT)
    description?: string;

    @Column(DataType.STRING)
    collectionName?: string;

    @Column(DataType.STRING)
    deliveryTime?: string;

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
    


    @Column(DataType.STRING)
    deliveryRegion?: string;

    @HasMany(() => MediaModel, {
        foreignKey: "collectionId", // Updated foreign key
        as: "media",
      })
      images?: MediaModel[];

    @Default(false)
    @Column(DataType.BOOLEAN)
    creationFeePaid?: boolean;

      @ForeignKey(() => DesignModel)
      @AllowNull(true) // Ensures foreign key cannot be null
      @Column(DataType.UUID)
      designId!: string;
    
      @BelongsTo(() => DesignModel, {
        foreignKey: "designId",
        as: "design",
        onDelete: "CASCADE",
      })
      design!: DesignModel;


  }