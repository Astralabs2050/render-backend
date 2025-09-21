import { Controller, Post, Get, Body, Param, UseGuards, Req, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ChatService } from '../services/chat.service';
import { MessageType } from '../entities/message.entity';
import { SendMessageWithDetailsDto } from '../dto/delivery-measurements.dto';
import { CloudinaryService } from '../../common/services/cloudinary.service';

@Controller('marketplace/chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post('create')
  async createChat(@Body() body: { jobId: string; makerId: string }, @Req() req) {
    const chat = await this.chatService.createChat(body.jobId, req.user.id, body.makerId);
    return {
      status: true,
      message: 'Chat created successfully',
      data: chat,
    };
  }

  @Post(':chatId/message')
  async sendMessage(
    @Param('chatId') chatId: string,
    @Body() body: SendMessageWithDetailsDto,
    @Req() req
  ) {
    const message = await this.chatService.sendMessage(
      chatId,
      req.user.id,
      body.content,
      body.type || MessageType.TEXT,
      body.deliveryDetails,
      body.measurements,
      body.actionType,
      body.attachments
    );
    return {
      status: true,
      message: 'Message sent successfully',
      data: message,
    };
  }

  @Get(':chatId/messages')
  async getMessages(@Param('chatId') chatId: string, @Req() req) {
    const messages = await this.chatService.getMessages(chatId, req.user.id);
    // Mark messages as read when user views them
    await this.chatService.markMessagesAsRead(chatId, req.user.id);
    return {
      status: true,
      message: 'Messages retrieved successfully',
      data: messages,
    };
  }

  @Get('my-chats')
  async getUserChats(@Req() req) {
    const chats = await this.chatService.getUserChats(req.user.id);
    return {
      status: true,
      message: 'Chats retrieved successfully',
      data: chats,
    };
  }

  @Post(':chatId/escrow/create')
  async createEscrow(
    @Param('chatId') chatId: string,
    @Body() body: { amount: number },
    @Req() req
  ) {
    const chat = await this.chatService.createEscrow(chatId, body.amount, req.user.id);
    return {
      status: true,
      message: 'Escrow created successfully',
      data: chat,
    };
  }

  @Post(':chatId/escrow/fund')
  async fundEscrow(@Param('chatId') chatId: string, @Req() req) {
    const chat = await this.chatService.fundEscrow(chatId, req.user.id);
    return {
      status: true,
      message: 'Escrow funded successfully',
      data: chat,
    };
  }

  @Post(':chatId/escrow/release')
  async releaseEscrow(@Param('chatId') chatId: string, @Req() req) {
    const chat = await this.chatService.releaseEscrow(chatId, req.user.id);
    return {
      status: true,
      message: 'Escrow released successfully',
      data: chat,
    };
  }

  @Get(':chatId/delivery-details')
  async getDeliveryDetails(@Param('chatId') chatId: string, @Req() req) {
    const deliveryDetails = await this.chatService.getDeliveryDetails(chatId, req.user.id);
    return {
      status: true,
      message: 'Delivery details retrieved successfully',
      data: deliveryDetails,
    };
  }

  @Get(':chatId/measurements')
  async getMeasurements(@Param('chatId') chatId: string, @Req() req) {
    const measurements = await this.chatService.getMeasurements(chatId, req.user.id);
    return {
      status: true,
      message: 'Measurements retrieved successfully',
      data: measurements,
    };
  }

  @Post('upload-image')
  @UseInterceptors(FileInterceptor('image', {
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
        cb(null, true);
      } else {
        cb(new Error('Only image files allowed'), false);
      }
    },
  }))
  async uploadImage(@UploadedFile() file: Express.Multer.File, @Req() req) {
    if (!file) {
      return {
        status: false,
        message: 'No image file provided',
        data: null,
      };
    }

    const result = await this.cloudinaryService.uploadImage(file.buffer, {
      folder: 'chat-images'
    });
    return {
      status: true,
      message: 'Image uploaded successfully',
      data: { imageUrl: result.secure_url },
    };
  }

  @Post(':chatId/complete-job')
  async markJobCompleted(@Param('chatId') chatId: string, @Req() req) {
    const message = await this.chatService.markJobCompleted(chatId, req.user.id);
    return {
      status: true,
      message: 'Job marked as completed',
      data: message,
    };
  }
}