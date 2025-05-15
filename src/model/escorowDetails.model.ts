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
  } from "sequelize-typescript";
  import { v4 as uuidv4 } from "uuid";
  import { UsersModel } from "./user.model";

  
  @Table({ timestamps: true, tableName: "escrow_details" })
  export class EscrowDetailssModel extends Model {
    @PrimaryKey
    @Default(uuidv4)
    @Column(DataType.UUID)
    id: string = uuidv4();
    
    @AllowNull(false)
    @Column(DataType.STRING)
    escorowId?: string;
  
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
  