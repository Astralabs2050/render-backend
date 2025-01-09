import {
  getSingleUploadedMedia,
  uploadSingleMedia,
} from "../../util/helperFunctions";
import { UsersModel } from "../model/user.model";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import sendEmail from "../../util/sendMail";
import {
  BrandModel,
  CreatorModel,
  MediaModel,
  ProjectModel,
  WorkExperienceModel,
} from "../model";
import { sequelize } from "../db";
import { uploadImageToS3 } from "../../util/aws";
import { Op } from "sequelize";

interface Brand {
  id: string; // UUID for the user
  verified: boolean; // Indicates if the user is verified
  active: boolean; // Indicates if the user is active
  isAdmin: boolean; // Indicates if the user has admin privileges
  email: string; // User's email address
  updatedAt: string; // Timestamp for when the user was last updated
  createdAt: string; // Timestamp for when the user was created
  username: string; // User's username
  userId: string; // UUID of the user
  password?: string | null;
  otp?: string | null;
}

export class AuthService {
  public async register(userData: any) {
    const { email, username, password, language } = userData;

    const userWithEmailExists = await UsersModel.findOne({ where: { email } });

    if (userWithEmailExists)
      return {
        status: false,
        message: `User with email ${email} already exists 1`,
      };

    const salt: string = await bcrypt.genSalt(15);
    const hashPassword: string = await bcrypt.hash(password, salt);
    const otp = uuidv4().substring(0, 4);

    const newUser = {
      email,
      password: hashPassword,
      username,
      otp,
      language,
    };

    const newCreateUser = await UsersModel.create(newUser);
    await uploadSingleMedia(
      newCreateUser?.id,
      "PROFILE_IMAGE",
      `https://api.dicebear.com/7.x/initials/svg?seed=${username}/svg?randomizeIds=false`,
      "user",
    );

    try {
      await sendEmail(email, "OTP", `otp ${otp}`);
    } catch (err) {
      console.log("Error sending mail:", err);
    }

    return { status: true, message: "User registered successfully" };
  }
  public async verifyCreator(data: any) {
    const transaction = await sequelize.transaction();
    try {
      const { fullName, email, password, language } = data;
      console.log("Processing registration...");

      // Check if the user already exists
      const userWithEmailExists = await UsersModel.findOne({
        where: { email },
      });
      if (userWithEmailExists) {
        return {
          status: false,
          message: `User with email ${email} already exists`,
        };
      }

      // Hash the password
      const salt = await bcrypt.genSalt(15);
      const hashPassword = await bcrypt.hash(password, salt);

      // Generate OTP
      const otp = uuidv4().slice(0, 4);
      console.log("Generated OTP:", otp);

      // Create user
      const newUser = await UsersModel.create(
        {
          email,
          language,
          password: hashPassword,
          otp,
        },
        { transaction },
      );

      // Create creator profile
      await CreatorModel.create(
        {
          userId: newUser.id,
          fullName,
        },
        { transaction },
      );

      // Commit transaction before sending email
      await transaction.commit();

      // Send OTP email
      try {
        await sendEmail(email, "OTP", `Your OTP is ${otp}`);
      } catch (emailError: any) {
        console.error("Error sending email:", emailError.message);
        return {
          status: true,
          message: "Registration successful, but OTP email failed",
          error: emailError.message,
        };
      }

      return {
        status: true,
        message: "Registration successful, OTP sent",
      };
    } catch (error: any) {
      // Rollback transaction on error
      await transaction.rollback();
      console.error("Error registering creator:", error);
      return {
        status: false,
        message: "Error registering creator",
        error: error.message,
      };
    }
  }

  public async login(credentials: any) {
    const { email, password } = credentials;

    if (!email) {
      return { status: false, message: "Provide email " };
    }

    let userExists = await UsersModel.findOne({ where: { email } });

    if (userExists) {
      const doesPasswordMatch = await bcrypt.compare(
        password,
        userExists.password,
      );
      if (doesPasswordMatch) {
        const jwtSecret: any = process.env.JWT_SECRET;

        const expirationTime = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
        const token = jwt.sign({ data: userExists }, jwtSecret, {
          expiresIn: expirationTime,
        });
        delete userExists?.dataValues["password"];
        delete userExists?.dataValues["otp"];
        return {
          status: true,
          message: "Login successful",
          data: { ...userExists?.dataValues, token },
        };
      } else {
        return { status: false, message: "Password does not match" };
      }
    } else {
      return { status: false, message: "User not found" };
    }
  }

  public async verifyOtp(otp: string, email: string) {
    const userToBeVerified = await UsersModel.findOne({
      where: {
        email,
        otp,
        verified: false,
      },
    });

    if (userToBeVerified) {
      await userToBeVerified.update({ verified: true });
      return { status: true, message: "OTP verified successfully" };
    } else {
      return { status: false, message: "Invalid OTP" };
    }
  }

  public async resendOtp(email: string) {
    const userToBeVerified: any = await UsersModel.findOne({
      where: { email, verified: false },
    });

    if (userToBeVerified) {
      const otp = uuidv4().substring(0, 4);
      await userToBeVerified.update({ otp });
      await sendEmail(email, "Resend OTP", `Hello your otp is  ${otp}`);
      return { status: true, message: `OTP sent to ${email}` };
    } else {
      return { status: false, message: "Email already verified or invalid" };
    }
  }
  public async registerCreatorService(data: any) {
    const transaction = await sequelize.transaction();
    try {
      const { email, fullName, profileImage } = data;

      // Check if the user already exists
      const userWithEmailExists = await UsersModel.findOne({
        where: { email },
        transaction,
      });

      if (!userWithEmailExists) {
        return {
          message: "Invalid Email",
          status: false,
        };
      }
      if (!userWithEmailExists?.verified) {
        return {
          message: "Please verify your email",
          status: false,
        };
      }
      // Check if the creator already exists
      const existingCreator = await CreatorModel.findOne({
        where: { userId: userWithEmailExists.id },
        transaction,
      });

      // Validate and process category and skills if they are arrays
      const category = Array.isArray(data?.category) ? data.category : [];
      const skills = Array.isArray(data?.skills) ? data.skills : [];

      if (existingCreator) {
        // Update the existing creator profile
        await CreatorModel.update(
          {
            fullName,
            location: data?.location,
            category,
            skills,
            creatorType: data?.creatorType,
          },
          {
            where: { userId: userWithEmailExists.id },
            transaction,
          },
        );

        // Get the creator's ID for work and projects
        const creatorId = existingCreator.id;

        // Update work experience if available
        if (Array.isArray(data?.work) && data.work.length > 0) {
          await WorkExperienceModel.destroy({
            where: { creatorId },
            transaction,
          });

          const workExperiences = data.work.map((work: any) => ({
            creatorId,
            title: work.title,
            description: work.description,
            companyName: work.companyName,
            startyear: work.startyear,
            startMonth: work.startMonth,
            endyear: work.endyear,
            endMonth: work.endMonth,
          }));
          await WorkExperienceModel.bulkCreate(workExperiences, {
            transaction,
          });
        }

        // Update projects if available
        if (Array.isArray(data?.projects) && data.projects.length > 0) {
          await ProjectModel.destroy({
            where: { creatorId },
            transaction,
          });

          const projectExperiences = data.projects.map((project: any) => ({
            creatorId,
            title: project.title,
            projectDescription: project.projectDescription,
            tags: project.tags,
          }));

          const newProjects = await ProjectModel.bulkCreate(
            projectExperiences,
            {
              transaction,
            },
          );

          try {
            await Promise.all(
              newProjects.map(async (project: any, index: number) => {
                // Upload project images (if available)
                console.log(
                  "data.projects[index]?.image",
                  data.projects[index]?.image,
                );
                const uploadPromises = Array.isArray(
                  data.projects[index]?.image,
                )
                  ? data.projects[index].image.map((image: any) =>
                      uploadImageToS3("PROJECT_IMAGE", image, project.id),
                    )
                  : [];

                console.log("uploadPromises", uploadPromises);

                // Wait for all image upload promises to resolve
                const uploadResults = await Promise.all(uploadPromises);

                // Filter out failed uploads and log if any uploads failed
                const successfulUploads = uploadResults.filter(
                  (result) => result.success,
                );
                const failedUploads = uploadResults.filter(
                  (result) => !result.success,
                );

                if (failedUploads.length > 0) {
                  console.warn("Some images failed to upload:", failedUploads);
                  await transaction.rollback();
                  throw new Error(
                    "Some images failed to upload. Please try again.",
                  );
                }

                // Collect only successful URLs for the database
                const imageLinks = successfulUploads.map(
                  (result) => result.url,
                );
                const mediaRecords = imageLinks.map((image_link: string) => ({
                  link: image_link,
                  mediaType: "USER_UPLOADED_IMAGES",
                  projectId: project.id, // Link to the newly created design
                }));

                // Save all media records in bulk within the transaction
                await MediaModel.bulkCreate(mediaRecords, { transaction });
              }),
            );
          } catch (error: any) {
            console.error(error);
            return {
              message: error.message,
              status: false,
            };
          }
        }
      } else {
        // Create the creator profile if it does not exist
        const creator = {
          userId: userWithEmailExists.id,
          location: data?.location,
          category,
          skills,
          creatorType: data?.creatorType,
        };
        const newCreator = await CreatorModel.create(creator, { transaction });

        // Create work experience and projects as before
        // [Insert the previous logic for creating work experience and projects]
      }

      // Commit the transaction
      await transaction.commit();

      // Upload profile picture after transaction is successful
      if (profileImage) {
        try {
          console.log("profileImageprofileImage", profileImage);
          // Step 1: Upload to AWS S3
          const uploadResult: any = await uploadImageToS3(
            "PROFILE_PICTURE",
            profileImage,
            userWithEmailExists.id,
          );

          // Check if the upload was successful
          if (!uploadResult.success) {
            console.warn("Failed to upload profile image to S3.");
            throw new Error(
              "Failed to upload profile image. Please try again.",
            );
          }

          // Step 2: Save the uploaded image link to the MediaModel
          const mediaRecord = {
            link: uploadResult.url, // Use the URL returned from S3
            mediaType: "PROFILE_PICTURE",
            userId: userWithEmailExists.id, // Link to the user
          };

          await MediaModel.create(mediaRecord);
          console.log(
            "Profile image successfully uploaded and saved to MediaModel.",
          );
        } catch (error: any) {
          console.error("Error uploading profile image to S3:", error.message);
          //throw new Error("Failed to upload profile image. Please try again.");
          return {
            status: false,
            message: "Error uploading profile image",
            error: `Error uploading profile image to S3: ${error.message}`,
          };
        }
      }

      return {
        status: true,
        message: existingCreator
          ? "Creator profile successfully updated"
          : "Creator profile successfully created",
      };
    } catch (error: any) {
      // Rollback transaction on error
      await transaction.rollback();
      console.error("Error registering creator:", error);
      return {
        status: false,
        message: "Error registering creator",
        error: error.message,
      };
    }
  }

  public async registerBrandService(data: any) {
    const transaction = await sequelize.transaction();

    try {
      const { email, password, username, country, city, language } = data;

      // Check if the user already exists
      const userWithEmailExists = await UsersModel.findOne({
        where: { email },
        transaction,
      });

      if (userWithEmailExists) {
        return {
          status: false,
          message: `User with email ${email} already exists`,
        };
      }

      const salt: string = await bcrypt.genSalt(15);
      const hashPassword: string = await bcrypt.hash(password, salt);
      const otp = uuidv4().slice(0, 4);

      const newUser = {
        email,
        password: hashPassword,
        otp,
        country,
        language,
        city,
      };

      // Create user with transaction
      const newCreateUser = await UsersModel.create(newUser, { transaction });

      const newBrand = {
        username,
        userId: newCreateUser.id,
      };

      // Create brand with transaction
      const newCreatedBrand = await BrandModel.create(newBrand, {
        transaction,
      });

      //send otp main
      await sendEmail(
        email,
        "Your OTP for Brand Verification",
        `
        <h1>Welcome, ${username}!</h1>
        <p>Your OTP is: <strong>${otp}</strong></p>
        <p>Please verify your brands email.</p>
      `,
      );
      // Commit the transaction
      await transaction.commit();
      const brandData: Brand = {
        ...newCreateUser.dataValues,
        ...newCreatedBrand.dataValues,
      };
      brandData["password"] = null;
      brandData["otp"] = null;
      delete brandData["password"];
      delete brandData["otp"];
      return {
        message: "Brand created successfully",
        status: true,
        data: brandData,
      };
    } catch (error: any) {
      // Rollback the transaction in case of error
      await transaction.rollback();
      return {
        status: false,
        message: `An error occurred: ${error?.message || error}`,
      };
    }
  }
  public async getAuthUser(id: string) {
    try {
      const user: any = await UsersModel.findOne({
        where: {
          id,
        },
        include: [
          {
            model: CreatorModel,
            as: "creator", // Alias defined in the association
            required: false, // Make it optional in case the user is not a creator
          },
          {
            model: BrandModel,
            as: "brand", // Alias defined in the association
            required: false, // Make it optional in case the user is not a brand
          },
          {
            model: MediaModel, // Include MediaModel to get profile picture
            where: {
              mediaType: "PROFILE_PICTURE", // Filter by mediaType = "PROFILE_PICTURE"
            },
            required: false, // Make it optional in case the user doesn't have a profile picture
          },
        ],
      });

      if (!user) {
        return {
          message: "User not found",
          status: false,
        };
      }

      return {
        message: "User found",
        data: {
          ...user.toJSON(),
        },
        status: true,
      };
    } catch (error: any) {
      return {
        status: false,
        message: `An error occurred: ${error?.message || error}`,
      };
    }
  }
  public async forgetPassword(email: string) {
    try {
      //get the user
      console.log("email", email);
      const userToBeVerified: any = await UsersModel.findOne({
        where: { email },
      });
      if (!userToBeVerified) {
        return {
          status: false,
          message: `User with email ${email} not found`,
        };
      }
      const otp = uuidv4().substring(0, 4);
      await userToBeVerified.update({
        otp,
        isOtpExp: false,
        otpCreatedAt: new Date(),
      });
      await sendEmail(email, "Resend OTP", `your reset otp is ${otp}`);
      return {
        status: true,
        message: `your reset password link has been sent to email`,
      };
    } catch (err: any) {
      return {
        message: err.message,
        status: false,
      };
    }
  }
  public async getProjects(userId: string) {
    try {
      // Find the user with related creator and projects
      const user: any = await UsersModel.findOne({
        where: {
          id: userId,
        },
        include: [
          {
            model: CreatorModel,
            as: "creator", // Alias defined in the association
            required: false, // Optional in case the user is not a creator
            include: [
              {
                model: ProjectModel,
                as: "projects", // Alias for the projects association
                include: [
                  {
                    model: MediaModel,
                    as: "media", // Alias for the media association
                  },
                ],
              },
            ],
          },
        ],
      });

      if (!user) {
        return {
          message: "User not found or no associated creator",
          status: false,
        };
      }

      return {
        message: "Projects and media fetched successfully",
        status: true,
        data: user.creator?.projects || [],
      };
    } catch (err: any) {
      return {
        message: err.message,
        status: false,
      };
    }
  }

  public async resetPasswordLink(data: any) {
    try {
      // Check if the data exists
      const validToken = await UsersModel.findOne({
        where: {
          otp: data.otp,
          email: data.email,
          otpCreatedAt: {
            [Op.gte]: new Date(new Date().getTime() - 60 * 60 * 1000), // OTP validity (1 hour)
          },
          isOtpExp: false,
        },
      });

      if (!validToken) {
        return {
          status: false,
          message: "Invalid OTP or Token expired",
        };
      }

      // Validate that password is provided
      if (!data?.password) {
        return {
          status: false,
          message: "Password is required",
        };
      }

      // Hash the password
      const salt: string = await bcrypt.genSalt(15);
      const hashedPassword: string = await bcrypt.hash(data.password, salt);

      // Update the password
      await validToken.update({
        password: hashedPassword,
        isOtpExp: true,
      });

      return {
        message: "Password updated successfully",
        status: true,
      };
    } catch (err: any) {
      return {
        message: err.message,
        status: false,
      };
    }
  }
}
