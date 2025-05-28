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
import { design_onboarding_astra } from "../agent/collection.config";
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

// Get chat history for AI context (limited to recent messages)
const getChatHistoryForAI = async (senderId: string, receiverId: string, limit: number = 15) => {
  try {
    const messages = await MessageModel.findAll({
      where: {
        [Op.or]: [
          { senderId, receiverId },
          { senderId: receiverId, receiverId: senderId }
        ]
      },
      order: [['createdAt', 'DESC']],
      limit,
      include: [
        {
          model: UsersModel,
          as: 'sender',
          attributes: ['id'],
          include: [
            { model: CreatorModel, as: 'creator', attributes: ['fullName'] },
            { model: BrandModel, as: 'brand', attributes: ['username'] }
          ]
        }
      ]
    });

    return messages.reverse().map(msg => ({
      id: msg.id,
      message: msg.message,
      type: msg.type,
      senderId: msg.senderId,
      receiverId: msg.receiverId,
      timestamp: msg.createdAt,
      isAIGenerated: msg.isAIGenerated || false,
      senderName: msg.sender?.creator?.fullName || msg.sender?.brand?.username || 'User'
    }));
  } catch (error) {
    console.error("Error getting chat history for AI:", error);
    return [];
  }
};

// Generate AI response for offline receiver
const generateAIResponse = async ({
  currentMessage,
  chatHistory,
  previousResponseId,
  senderName,
  receiverName,
  messageType
}: {
  currentMessage: string;
  chatHistory: any[];
  previousResponseId?: string;
  senderName: string;
  receiverName: string;
  messageType: string;
}) => {
  try {
    // Build context from chat history
    const conversationContext = chatHistory.slice(-10).map(msg => 
      `${msg.senderName}: ${msg.message}`
    ).join('\n');

    // Find previous response if ID is provided
    let previousResponse = null;
    if (previousResponseId) {
      previousResponse = await MessageModel.findByPk(previousResponseId);
    }

    // Prepare prompt for AI
    const systemPrompt = `You are an AI assistant responding on behalf of ${receiverName} who is currently offline. 
    Your responses should be:
    1. Helpful and contextually appropriate
    2. Professional but friendly
    3. Acknowledge you're responding as an AI assistant
    4. Mention that ${receiverName} will get back to them
    5. Keep responses concise (under 100 words)
    6. Ask relevant follow-up questions when appropriate`;

    const userPrompt = `
    Chat History:
    ${conversationContext}
    
    Latest Message from ${senderName}: ${currentMessage}
    ${previousResponse ? `Previous Response Context: ${previousResponse.message}` : ''}
    
    Respond helpfully on behalf of ${receiverName}.
    `;

    const response = await client.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 150,
      temperature: 0.7,
    });

    const aiResponse = response.choices[0]?.message?.content;

    if (!aiResponse) {
      throw new Error("No content returned from OpenAI.");
    }

    return {
      message: aiResponse.trim(),
      context: conversationContext,
      respondedAt: new Date()
    };
  } catch (error) {
    console.error("Error generating AI response:", error);
    // Fallback response
    return {
      message: `Hi ${senderName}! I'm an AI assistant responding for ${receiverName} who is currently offline. They'll get back to you as soon as possible. Feel free to share any additional details about what you need help with.`,
      context: "",
      respondedAt: new Date()
    };
  }
};

// Handle AI agent response when receiver is offline
const handleAIAgentResponse = async ({
  originalMessage,
  senderId,
  receiverId,
  previousResponseId,
  senderData,
  receiverData,
  io
}: {
  originalMessage: any;
  senderId: string;
  receiverId: string;
  previousResponseId?: string;
  senderData: any;
  receiverData: any;
  io: any;
}) => {
  try {
    console.log("Generating AI response for offline receiver:", receiverId);
    
    // Get previous chat history for context
    const chatHistory = await getChatHistoryForAI(senderId, receiverId);
    
    // Generate AI response
    const aiResponse = await generateAIResponse({
      currentMessage: originalMessage.message,
      chatHistory,
      previousResponseId,
      senderName: senderData?.dataValues?.creator?.dataValues?.fullName || 
                  senderData?.dataValues?.brand?.dataValues?.username || 'User',
      receiverName: receiverData?.dataValues?.creator?.dataValues?.fullName || 
                    receiverData?.dataValues?.brand?.dataValues?.username || 'User',
      messageType: originalMessage.type
    });

    // Create AI agent message - treating it like a user message
    const aiMessage = await MessageModel.create({
      message: aiResponse.message,
      type: "text",
      receiverId: senderId, // AI responds to the sender
      senderId: receiverId, // AI acts as the receiver
      sent: true,
      seen: false, // Sender hasn't seen it yet
      createdAt: new Date(),
      isAIGenerated: true, // Flag to identify AI messages
      previousResponseId: originalMessage.id, // Link to the original message
    });

    console.log("AI message created:", aiMessage.id);

    // Check if sender is still online and broadcast the AI response
    const senderOnline = await UsersModel.findOne({
      where: { id: senderId },
      attributes: ["active"],
    });

    if (senderOnline?.active) {
      // Format the AI message like a regular message for consistency
      const formattedAIMessage = {
        id: aiMessage.id,
        message: aiMessage.message,
        type: aiMessage.type,
        receiverId: aiMessage.receiverId,
        senderId: aiMessage.senderId,
        sent: aiMessage.sent,
        seen: aiMessage.seen,
        createdAt: aiMessage.createdAt,
        isAIGenerated: true,
        // Include sender info for consistency with regular messages
        sender: {
          id: receiverId,
          creator: receiverData?.dataValues?.creator,
          brand: receiverData?.dataValues?.brand,
          media: receiverData?.dataValues?.media
        }
      };

      console.log("Broadcasting AI response to sender:", senderId);
      io.to(senderId).emit("privateMessage", formattedAIMessage);
    }

    return aiMessage;
  } catch (error) {
    console.error("Error in AI agent response:", error);
    throw error;
  }
};

const saveAndBroadcastMessage = async (data: any, io?: any) => {
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
      previousResponseId: data.previousResponseId || null, // Add previous response ID support
      isAIGenerated: false, // Regular user message
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

    // If receiver is offline, trigger AI agent response and send email
    if (!receiver?.active) {
      // Send email notification first
      if (receiverData?.dataValues?.email && senderData?.dataValues?.email) {
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

      // Trigger AI agent response if io is available
      if (io) {
        await handleAIAgentResponse({
          originalMessage: message,
          senderId: data.senderId,
          receiverId: data.receiverId,
          previousResponseId: data.previousResponseId,
          senderData,
          receiverData,
          io
        });
      }
    }

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
  try {
    const response = await client.chat.completions.create({
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
    });

    const translatedText = response.choices[0]?.message?.content;

    if (!translatedText) {
      throw new Error("Translation failed: No content returned from OpenAI.");
    }

    return translatedText.trim();
  } catch (error: any) {
    console.error("Translation error:", error);
    throw new Error(`Translation failed: ${error.message}`);
  }
}

export async function handlePrivateMessage(socket: any, io: any) {
  socket.on("privateMessage", async (data: any) => {
    try {
      const message = await saveAndBroadcastMessage(data, io); // Pass io for AI agent
      io.to(data.receiverId).emit("privateMessage", message);
    } catch (error) {
      console.error("Error handling private message:", error);
    }
  });
}

/**
 * Handles agent private messages through socket communication
 * @param socket The socket instance for the current connection
 * @param io The socket.io server instance
 */
export async function handleAgentPrivateMessage(socket: any, io: any) {
  if (!socket) {
    console.error("Invalid socket provided to handleAgentPrivateMessage");
    return;
  }

  if (!io) {
    console.error("Invalid io instance provided to handleAgentPrivateMessage");
    return;
  }

  socket.on("agentMessage", async (data: any) => {
    console.log("this the data to be sent11111", data)
    // Validate incoming data
    if (!data) {
      console.error("Empty or undefined data received in agentMessage event");
      return emitError(io, socket, data?.senderId, "Invalid request data");
    }

    if (!data.senderId) {
      console.error("Missing senderId in agentMessage event data");
      return emitError(io, socket, "unknown", "Missing sender ID");
    }
    
    try {
      // Log incoming request (excluding large payloads)
      const logSafeData = { ...data };
      console.log("this is the logsafedata", logSafeData)
      if (logSafeData.images) logSafeData.images = `[${logSafeData.images.length} IMAGES]`;
      console.log("Processing agent message request:", logSafeData);

      // Process the agent request
      const response = await collectionAgentClass.collectionAgent(data);

      // Validate response
      if (!response) {
        throw new Error("Empty response received from collection agent");
      }

      // Parse output text with error handling
      let parsedMessage;
      try {
        const outputText = response?.response?.output_text;
        if (!outputText) {
          throw new Error("Missing output_text in agent response");
        }
        parsedMessage = JSON.parse(outputText);
        console.log("parsedMessage", parsedMessage)
      } catch (parseError: any) {
        console.error("Failed to parse agent response:", parseError);
        return emitError(
          io, 
          socket, 
          data.senderId,
          "Failed to process agent response",
          response?.id,
          response?.collectionId
        );
      }
      console.log("the message is been emitted to the backend")
      
      // Emit successful response
      return io.to(data.senderId).emit("agent_message", {
        data: {
          message: parsedMessage,
          collectionId: response?.collectionId || null,
          id: response?.id || null,
          generatedImageBase64: response?.generatedImageBase64
        }
      });
    } catch (error: any) {
      // Log detailed error information
      console.error("Error handling agent message:", {
        error: error.message || String(error),
        stack: error.stack,
        senderId: data?.senderId,
        type: data?.type
      });

      // Send appropriate error message to client
      return emitError(
        io, 
        socket, 
        data.senderId, 
        getClientFriendlyErrorMessage(error)
      );
    }
  });
}

/**
 * Emit an error message to the client via socket
 * @param io Socket.io server instance
 * @param socket Current socket connection
 * @param senderId ID of the recipient
 * @param errorMessage User-friendly error message
 * @param responseId Optional response ID to include
 * @param collectionId Optional collection ID to include
 */
function emitError(
  io: any, 
  socket: any, 
  senderId: string, 
  errorMessage: string,
  responseId?: string,
  collectionId?: string
) {
  if (!senderId || !io) {
    // Fallback to socket if io or senderId is invalid
    return socket.emit("agent_error", {
      error: errorMessage || "An unknown error occurred"
    });
  }

  // Emit error to specific user
  return io.to(senderId).emit("agent_error", {
    error: errorMessage || "An unknown error occurred",
    collectionId: collectionId || null,
    id: responseId || null
  });
}

/**
 * Convert technical error messages to user-friendly messages
 * @param error The original error object
 * @returns A user-friendly error message
 */
function getClientFriendlyErrorMessage(error: any): string {
  // Extract error message
  const errorMsg = error?.message || String(error);

  // Map known error types to user-friendly messages
  if (errorMsg.includes("Missing images")) {
    return "Please provide at least one valid image to process";
  }
  
  if (errorMsg.includes("Failed to upload")) {
    return "We couldn't upload your image(s). Please try again with a different image format or size";
  }
  
  if (errorMsg.includes("Collection with ID") && errorMsg.includes("not found")) {
    return "The collection you're trying to update doesn't exist";
  }
  
  if (errorMsg.includes("AI model request failed")) {
    return "Our AI service is currently experiencing issues. Please try again in a few moments";
  }
  
  if (errorMsg.includes("Missing senderId")) {
    return "Authentication error. Please log in again";
  }

  // Default error message for unexpected errors
  return "Something went wrong while processing your request. Please try again";
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