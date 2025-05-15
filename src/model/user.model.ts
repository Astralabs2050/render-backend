import {
  Model,
  Table,
  PrimaryKey,
  Column,
  DataType,
  AllowNull,
  Default,
  Index,
  HasOne,
  HasMany,
} from "sequelize-typescript";
import { v4 as uuidv4 } from "uuid";
import { CreatorModel } from "./creator.model";
import { BrandModel } from "./brand.model";

enum userType {
  brand = "brand",
  creator = "creator",
}

import { MediaModel } from "./media.model"; // Adjust the import path as needed

@Table({ timestamps: true, tableName: "users" })
export class UsersModel extends Model {
  @PrimaryKey
  @Default(uuidv4)
  @Column(DataType.UUID)
  id: string = uuidv4();

  @HasOne(() => CreatorModel, {
    foreignKey: "userId", // Reference to the user's id
    as: "creator", // Alias for the association
  })
  creator?: CreatorModel;

  @HasOne(() => BrandModel, {
    foreignKey: "userId", // Reference to the user's id
    as: "brand", // Alias for the association
  })
  brand?: BrandModel;

  // Add the HasMany association for MediaModel
  @HasMany(() => MediaModel, {
    foreignKey: "userId", // Reference to the user's id in the MediaModel
    as: "media", // Alias for the media association
  })
  media?: MediaModel[];

  @Index({ name: "combined-key-index1", unique: true })
  @AllowNull(false)
  @Column(DataType.STRING)
  email!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  password!: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  language!: string;

   @AllowNull(true)
    @Column(DataType.STRING)
    wallet!: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  city!: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  country!: string;

  @Default(false)
  @Column(DataType.BOOLEAN)
  verified?: boolean;

  @Default(false)
  @Column(DataType.BOOLEAN)
  active?: boolean;

  @AllowNull(true)
  @Column(DataType.DATE)
  lastseen?: Date;

  @AllowNull(true)
  @Column(DataType.STRING)
  otp?: string;

  @Default(false)
  @Column(DataType.BOOLEAN)
  isOtpVerified?: boolean;

  @Default(Date.now) // Automatically set to the current timestamp
  @Column(DataType.DATE)
  otpCreatedAt?: Date; // Track when the OTP was generated

  @Default(false)
  @Column(DataType.BOOLEAN)
  isOtpExp?: boolean;

  @Default(false)
  @Column(DataType.BOOLEAN)
  isAdmin?: boolean;

  @AllowNull(true)
  @Column(DataType.ENUM(...Object.values(userType)))
  userType?: userType;

  toJSON() {
    const values = { ...this.get() } as any;
    delete values.password;
    return values;
  }

  // Computed method to check if OTP is expired
  isOtpExpired(): boolean {
    if (!this.otpCreatedAt) {
      return true; // Consider it expired if there's no timestamp
    }
    const expirationTime = new Date(
      this.otpCreatedAt.getTime() + 30 * 60 * 1000,
    ); // 30 minutes in milliseconds
    return new Date() > expirationTime;
  }
}
