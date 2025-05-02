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
  } from "sequelize-typescript";
  import { v4 as uuidv4 } from "uuid";
import { DesignModel } from "./design.model";

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

    @Column(DataType.STRING)
    collectionName?: string;

    @Column(DataType.STRING)
    deliveryTime?: string;

    @Column(DataType.STRING)
    deliveryRegion?: string;

    @Default(false)
    @Column(DataType.BOOLEAN)
    creationFeePaid?: boolean;

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


  }