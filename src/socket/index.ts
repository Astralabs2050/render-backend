// File: socketHandler.js
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { test } from "./handlers";
import { getPreviousMessages, handlePrivateMessage, translateMessage } from "./handleMessages";
import {
  BrandModel,
  CreatorModel,
  DesignModel,
  JobModel,
  MediaModel,
  UsersModel,
} from "../model";

const JWT_SECRET: string = process.env.JWT_SECRET as string;

const handleSocketConnection = (io: {
  use: (arg0: (socket: any, next: any) => Promise<any>) => void;
  on: (arg0: string, arg1: (socket: any) => Promise<void>) => void;
}) => {
  io.use(async (socket, next) => {
    try {
      const token =
        socket?.handshake?.headers?.token || socket?.handshake?.auth?.token;
      console.log("token from socket12", socket);
      if (!token) {
        throw new Error("Unauthorized: Missing token");
      }

      const decoded: any = jwt.verify(token, JWT_SECRET);

      const currentTimestamp = Math.floor(Date.now() / 1000);
      if (decoded?.exp && decoded?.exp < currentTimestamp) {
        throw new Error("Unauthorized: Token Expired");
      }

      const userData = decoded?.data;
      console.log("userData", userData);
      if (userData) {
        delete userData?.password;
      }

      socket.user = userData;

      socket.id = userData?.id;
      next();
    } catch (err) {
      console.error("JWT verification error:", err);
      return next(new Error("Unauthorized: Invalid token"));
    }
  });

  io.on("connection", async (socket) => {
    console.log(`${socket.id} connected now`);

    // Emit connection status
    socket.emit("connection_status", true);

    //get the brands
    socket.on("get_brands", async (data: any) => {
      try {
        console.log("Received data:", data); // Log incoming data
        if (!socket?.id) {
          return socket.emit("error", { message: "User ID is required" });
        }

        console.log("Fetching jobs for user:", socket?.id);
        const jobs = await JobModel.findAll({
          where: {
            userId: socket?.id, // Filters jobs based on the userId linked to the socket ID
          },
          include: [
            {
              model: UsersModel, // The related model
              as: "maker", // The alias defined in the JobModel
              required: false, // Include jobs even if no maker is associated
              include: [
                {
                  model: CreatorModel,
                  as: "creator", // Alias defined in UsersModel
                },
                {
                  model: BrandModel,
                  as: "brand", // Alias defined in UsersModel
                },
                {
                  model: MediaModel,
                  as: "media",
                  where: {
                    mediaType: "PROFILE_PICTURE", // Filter by mediaType = "PROFILE_PICTURE"
                  },
                  required: false, // Make it optional in case the user doesn't have a profile picture
                },
              ],
              attributes: {
                exclude: [
                  "password",
                  "isOtpVerified",
                  "otpCreatedAt",
                  "isOtpExp",
                  "otp",
                ],
              }, // Exclude sensitive fields
            },
            {
              model: UsersModel, // The related model
              as: "user", // The alias defined in the JobModel
              required: false, // Include jobs even if no maker is associated
              include: [
                {
                  model: CreatorModel,
                  as: "creator", // Alias defined in UsersModel
                },
                {
                  model: BrandModel,
                  as: "brand", // Alias defined in UsersModel
                },
                {
                  model: MediaModel,
                  as: "media",
                  where: {
                    mediaType: "PROFILE_PICTURE", // Filter by mediaType = "PROFILE_PICTURE"
                  },
                  required: false, // Make it optional in case the user doesn't have a profile picture
                },
              ],
              attributes: {
                exclude: [
                  "password",
                  "isOtpVerified",
                  "otpCreatedAt",
                  "isOtpExp",
                  "otp",
                ],
              }, // Exclude sensitive fields
            },
            {
              model: DesignModel, // The related model
              as: "design", // The alias defined in the JobModel
              required: false,
            },
          ],
        });

        //find jobs where the user is the maker
        const makersJob = await JobModel.findAll({
          where: {
            makerId: socket?.id,
          },
          include: [
            {
              model: UsersModel, // The related model
              as: "maker", // The alias defined in the JobModel
              required: false, // Include jobs even if no maker is associated
              include: [
                {
                  model: CreatorModel,
                  as: "creator", // Alias defined in UsersModel
                },
                {
                  model: BrandModel,
                  as: "brand", // Alias defined in UsersModel
                },
                {
                  model: MediaModel,
                  as: "media",
                  where: {
                    mediaType: "PROFILE_PICTURE", // Filter by mediaType = "PROFILE_PICTURE"
                  },
                  required: false, // Make it optional in case the user doesn't have a profile picture
                },
              ],
              attributes: {
                exclude: [
                  "password",
                  "isOtpVerified",
                  "otpCreatedAt",
                  "isOtpExp",
                  "otp",
                ],
              }, // Exclude sensitive fields
            },
            {
              model: UsersModel, // The related model
              as: "user", // The alias defined in the JobModel
              required: false, // Include jobs even if no maker is associated
              include: [
                {
                  model: CreatorModel,
                  as: "creator", // Alias defined in UsersModel
                },
                {
                  model: BrandModel,
                  as: "brand", // Alias defined in UsersModel
                },
                {
                  model: MediaModel,
                  as: "media",
                  where: {
                    mediaType: "PROFILE_PICTURE", // Filter by mediaType = "PROFILE_PICTURE"
                  },
                  required: false, // Make it optional in case the user doesn't have a profile picture
                },
              ],
              attributes: {
                exclude: [
                  "password",
                  "isOtpVerified",
                  "otpCreatedAt",
                  "isOtpExp",
                  "otp",
                ],
              }, // Exclude sensitive fields
            },
            {
              model: DesignModel, // The related model
              as: "design", // The alias defined in the JobModel
              required: false,
            },
          ],
        });
        console.log("makersJob", makersJob);

        console.log("Fetched jobs:", [...jobs, ...makersJob]);
        socket.emit("brands", [...jobs, ...makersJob]); // Send jobs back to the client
      } catch (error) {
        console.error("Error in get_brands:", error);
        socket.emit("error", {
          message: "An error occurred while fetching jobs",
        });
      }
    });

    //handle private messages
    handlePrivateMessage(socket, io);
    //handle translation
    socket.on("translation", async(data: any)=>{
      try{
      const receiver = await UsersModel.findOne({
        where: { id: socket.id},
        attributes: ["language"],
      });
      console.log("receiver111", receiver?.dataValues?.language);
      const translatedMessage = await translateMessage(data.message, receiver?.dataValues?.language);

      socket.emit("translation", translatedMessage);
      console.log("translatedMessage", translatedMessage);
      }catch (error) {
        console.error("Error in translation:", error);
        socket.emit("error", {
          message: "An error occurred while translating",
        });
      }
    })
    //get private message
    getPreviousMessages(socket);

    // Handle disconnect
    socket.on("disconnect", async () => {
      console.log(`${socket.id} disconnected`);
    });
  });
};

export { handleSocketConnection };

