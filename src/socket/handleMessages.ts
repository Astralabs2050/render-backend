import { Op } from "sequelize";
import {
  BrandModel,
  CreatorModel,
  JobModel,
  MediaModel,
  UsersModel,
} from "../model";
import { MessageModel } from "../model/ChatMessage.model";
import sendEmail from "../../util/sendMail";
import { uploadImageToS3 } from "../../util/aws";
import e from "express";
import  { design_onboarding_astra } from "../agent/collection.config";
import client from "./llm";
import collectionAgentClass from "../service/collection.service";

export function sendMessage(io: any) {}

export function receiveMessage(io: any) {}

const getMessages = async (senderId: string, receiverId: string) => {
  // Retrieve both sent and received messages for a conversation
  return MessageModel.findAll({
    where: {
      [Op.or]: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    },
    order: [["createdAt", "ASC"]],
    include: [
      {
        model: UsersModel,
        as: "sender",
        attributes: {
          exclude: ["password", "isOtpVerified", "otpCreatedAt", "isOtpExp"],
        }, // Exclude sensitive fields
        include: [
          {
            model: MediaModel,
            as: "media",
            required: false, // Allow messages without associated media
          },
        ],
      },
      {
        model: UsersModel,
        as: "receiver",
        attributes: {
          exclude: ["password", "isOtpVerified", "otpCreatedAt", "isOtpExp"],
        }, // Exclude sensitive fields
        include: [
          {
            model: MediaModel,
            as: "media",
            required: false,
          },
        ],
      },
    ],
  });
};

const saveAndBroadcastMessage = async (data: any) => {
  try {
    // Check if the receiver is online
    const receiver = await UsersModel.findOne({
      where: { id: data.receiverId },
      attributes: ["active"],
    });
    //check if the message is an image or text
    let uploadResult: any;
    if (data.type === "image") {
      //upload it to the s3 storage and save
      uploadResult = await uploadImageToS3(
        "CHAT_MEDIA",
        data.message,
        data.senderId,
      );
      if (!uploadResult.success) {
        console.warn("Failed to upload profile image to S3.");
        throw new Error("Failed to upload profile image. Please try again.");
      }

      // Step 2: Save the uploaded image link to the MediaModel
      const mediaRecord = {
        link: uploadResult.url, // Use the URL returned from S3
        mediaType: "PROFILE_PICTURE",
        userId: data.senderId, // Link to the user
      };

      await MediaModel.create(mediaRecord);
      console.log(
        "Profile image successfully uploaded and saved to MediaModel.",
      );
    }

    // Create the message with a seen status based on receiver's availability
    const message = await MessageModel.create({
      message: data.type === "image" ? uploadResult?.url : data.message,
      type: data.type,
      receiverId: data.receiverId,
      senderId: data.senderId,
      sent: true,
      seen: receiver?.active ?? false,
      createdAt: data.createdAt,
    });
    // find the receiver on the database
    const receiverData = await UsersModel.findOne({
      where: { id: data.receiverId },
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
      ],
    });
    const senderData = await UsersModel.findOne({
      where: { id: data.senderId },
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
      ],
    });
    console.log(
      "receiverData",
      receiverData?.dataValues?.brand?.dataValues?.username,
    );
    if (
      receiverData?.dataValues?.email &&
      senderData?.dataValues?.email &&
      !receiver?.active
    ) {
      sendEmail(
        receiverData?.dataValues?.email,
        `You have a Message from ${
          senderData?.dataValues?.creator?.dataValues?.fullName ||
          senderData?.dataValues?.brand?.dataValues?.username
        }`,
        `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333;">
          <h2 style="color: #4CAF50;">You have a new message!</h2>
          <p>Hi ${
            receiverData?.dataValues?.brand?.dataValues?.username ||
            receiverData?.dataValues?.creator?.dataValues?.fullName ||
            "there"
          },</p>
          <p>
            You have received a message from <strong>${
              senderData?.dataValues?.creator?.dataValues?.fullName ||
              senderData?.dataValues?.brand?.dataValues?.username ||
              "a user"
            }</strong>.
          </p>
          <p>
            Please check your inbox for further details.
          </p>
          <p style="margin-top: 20px;">Thank you,</p>
          <p><strong>Your Team</strong></p>
        </div>
        `,
      );
    }
    //send mail to the receiver
    return message;
  } catch (error) {
    console.error("Error in saveAndBroadcastMessage:", error);
    throw error;
  }
};

export async function getPreviousMessages(socket: any) {
  socket.on("get_previous_messages", async (data: any) => {
    try {
      const messages = await getMessages(data.senderId, data.receiverId);

      socket.emit("previous_messages", messages);
    } catch (error) {
      console.error("Error retrieving previous messages:", error);
    }
  });
}
export async function translateMessage(
  message: string,
  language: string,
): Promise<string> {
  const apiKey = process.env.OPEN_API_KEY; // Ensure your OpenAI API key is set in environment variables
  const apiUrl = "https://api.openai.com/v1/chat/completions";

  if (!apiKey) {
    throw new Error("OpenAI API key is not set.");
  }

  const body = {
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: `You are a translation assistant.` },
      {
        role: "user",
        content: `Translate the following message to ${language || "english"}, only return the translated text: "${message}"`,
      },
    ],
    max_tokens: 100,
    temperature: 0.3,
  };

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorDetails = await response.json();
    throw new Error(
      `OpenAI API request failed: ${response.status} - ${response.statusText} - ${JSON.stringify(
        errorDetails,
      )}`,
    );
  }

  const data = await response.json();
  const translatedText = data.choices[0]?.message?.content;

  if (!translatedText) {
    throw new Error("Translation failed: No content returned from OpenAI.");
  }

  return translatedText.trim();
}

export async function handlePrivateMessage(socket: any, io: any) {
  socket.on("privateMessage", async (data: any) => {
    try {
      const message = await saveAndBroadcastMessage(data);
      io.to(data.receiverId).emit("privateMessage", message);
    } catch (error) {
      console.error("Error handling private message:", error);
    }
  });
}

export async function handleAgentPrivateMessage(socket:any, io:any){
  socket.on("agentMessage",async(data:any)=>{
    try{
     const response = await collectionAgentClass.collectionAgent(data)
      io.to(data.senderId).emit("agent_message", {
        data:{
          message:response?.output_text,
          id:response?.id
        }
      });
    }catch(error:any){
      console.error("Error handling agent message:", error);
      throw new Error(error?.message || error || "Error in agent message");
    }
  })
}

export async function updateUserAvailability(status: boolean, id: string) {
  try {
    await UsersModel.update({ active: status }, { where: { id } });
  } catch (error) {
    console.error("Error updating user availability:", error);
  }
}

export function markAsRead(io: any) {
  io.on("connection", (socket: any) => {
    socket.on("mark_as_read", async (data: any) => {
      try {
        await MessageModel.update(
          { seen: true },
          {
            where: {
              receiverId: data.receiverId,
              senderId: data.senderId,
              seen: false,
            },
          },
        );
        io.to(data.senderId).emit("message_read", {
          receiverId: data.receiverId,
        });
      } catch (error) {
        console.error("Error in markAsRead:", error);
      }
    });
  });
}

export function typing(io: any) {
  io.on("connection", (socket: any) => {
    socket.on("typing", (data: any) => {
      try {
        io.to(data.receiverId).emit("typing", { senderId: data.senderId });
      } catch (error) {
        console.error("Error in typing:", error);
      }
    });

    socket.on("stop_typing", (data: any) => {
      try {
        io.to(data.receiverId).emit("stop_typing", { senderId: data.senderId });
      } catch (error) {
        console.error("Error in stop_typing:", error);
      }
    });
  });
}
