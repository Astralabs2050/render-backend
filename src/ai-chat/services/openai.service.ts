import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { CloudinaryService } from '../../common/services/cloudinary.service';
import { PromptService } from './prompt.service';
@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private readonly apiKey: string;
  private readonly apiUrl = 'https://api.openai.com/v1/chat/completions';
  private readonly axiosInstance: AxiosInstance;
  constructor(
    private configService: ConfigService,
    private promptService: PromptService,
    private cloudinaryService: CloudinaryService,
  ) {
    this.apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.axiosInstance = axios.create({
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });
  }
  async classifyIsFashionPrompt(prompt: string): Promise<boolean> {
    try {
      const response = await this.axiosInstance.post(
        this.apiUrl,
        {
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content:
                'Classify if the USER text is a fashion design request (garment, apparel, outfit, fabric, style, construction, tailoring, fashion accessories). Reply with a single token: yes or no. No explanations.'
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0,
          max_tokens: 2,
        }
      );
      const text = (response.data?.choices?.[0]?.message?.content || '').toLowerCase();
      return text.includes('yes');
    } catch (error) {
      this.logger.warn(`OpenAI classify fallback (error: ${error?.message || 'unknown'})`);
      // Fallback: accept non-empty prompts
      return !!prompt && prompt.trim().length > 3;
    }
  }
  async generateChatResponse(messages: any[]): Promise<string> {
    try {
      const enhancedMessages = [
        {
          role: 'system',
          content: 'You are an expert fashion design AI assistant. You help creators and makers collaborate on fashion projects. You can analyze designs, suggest improvements, provide technical fashion advice, discuss trends, materials, construction techniques, and help with design ideation. You understand both creative and technical aspects of fashion design.'
        },
        ...messages.slice(1)
      ];
      const response = await this.axiosInstance.post(
        this.apiUrl,
        {
          model: 'gpt-4o',
          messages: enhancedMessages,
          temperature: 0.7,
          max_tokens: 600,
        }
      );
      return response.data.choices[0].message.content;
    } catch (error) {
      this.logger.error(`OpenAI API error: ${error.message}`);
      return "I'm having trouble connecting right now. Please try again in a moment.";
    }
  }
  async generateDesignMetadata(prompt: string, imageUrl?: string): Promise<any> {
    try {
      const messages = [
        { role: 'system', content: 'You are a fashion design assistant that extracts structured metadata from design descriptions.' },
        { role: 'user', content: `Extract metadata for this fashion design: "${prompt}"` }
      ];
      if (imageUrl) {
        messages[1].content += ` (Reference image provided)`;
      }
      const response = await this.axiosInstance.post(
        this.apiUrl,
        {
          model: 'gpt-4o',
          messages,
          temperature: 0.3,
          max_tokens: 500,
          functions: [
            {
              name: 'extract_design_metadata',
              description: 'Extract structured metadata from a fashion design description',
              parameters: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    description: 'Name of the design'
                  },
                  category: {
                    type: 'string',
                    description: 'Category of the design (e.g., Dress, Suit, Streetwear)'
                  },
                  price: {
                    type: 'number',
                    description: 'Suggested price in USD'
                  },
                  timeframe: {
                    type: 'number',
                    description: 'Estimated days to make'
                  },
                  colors: {
                    type: 'array',
                    items: {
                      type: 'string'
                    },
                    description: 'Color tags'
                  },
                  description: {
                    type: 'string',
                    description: 'Brief description of the design'
                  }
                },
                required: ['name', 'category', 'price', 'timeframe', 'colors', 'description']
              }
            }
          ],
          function_call: { name: 'extract_design_metadata' }
        },
      );
      const functionCall = response.data.choices[0].message.function_call;
      if (functionCall && functionCall.name === 'extract_design_metadata') {
        return JSON.parse(functionCall.arguments);
      }
      return {
        name: 'Custom Design',
        category: 'Dress',
        price: 100,
        timeframe: 7,
        colors: ['white'],
        description: prompt
      };
    } catch (error) {
      this.logger.error(`OpenAI metadata extraction error: ${error.message}`);
      return {
        name: 'Custom Design',
        category: 'Dress',
        price: 100,
        timeframe: 7,
        colors: ['white'],
        description: prompt
      };
    }
  }
  async extractDesignInfo(content: string): Promise<any> {
    try {
      const response = await this.axiosInstance.post(
        this.apiUrl,
        {
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: 'Extract fashion design information from user input. Return JSON with available fields.' },
            { role: 'user', content: `Extract design info: "${content}"` }
          ],
          temperature: 0.3,
          max_tokens: 300,
        }
      );
      const result = response.data.choices[0].message.content;
      try {
        return JSON.parse(result);
      } catch {
        return { garmentType: null, style: null, colors: null, size: null, occasion: null };
      }
    } catch (error) {
      this.logger.error(`Design info extraction error: ${error.message}`);
      return { garmentType: null, style: null, colors: null, size: null, occasion: null };
    }
  }
  async updateDesignInfo(existingInfo: any, newContent: string): Promise<any> {
    try {
      const response = await this.axiosInstance.post(
        this.apiUrl,
        {
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: 'Update existing design info with new user input. Return complete JSON.' },
            { role: 'user', content: `Existing: ${JSON.stringify(existingInfo)}\nNew input: "${newContent}"` }
          ],
          temperature: 0.3,
          max_tokens: 300,
        }
      );
      const result = response.data.choices[0].message.content;
      try {
        return JSON.parse(result);
      } catch {
        return existingInfo;
      }
    } catch (error) {
      this.logger.error(`Design info update error: ${error.message}`);
      return existingInfo;
    }
  }
  async generateResponse(content: string): Promise<string> {
    try {
      const response = await this.axiosInstance.post(
        this.apiUrl,
        {
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are Astra AI, a fashion design assistant. Keep responses brief (1-2 sentences max). Be conversational and guide users toward fashion design.' },
            { role: 'user', content }
          ],
          temperature: 0.7,
          max_tokens: 80,
        }
      );
      return response.data.choices[0].message.content;
    } catch (error) {
      this.logger.error(`Response generation error: ${error.message}`);
      return "I'm having trouble right now. Please try again.";
    }
  }
  async generateDesignImage(prompt: string, referenceImageBase64?: string): Promise<string> {
    try {
      const enhancedPrompt = await this.enhanceDesignPrompt(prompt, referenceImageBase64);
      const response = await this.axiosInstance.post(
        'https://api.openai.com/v1/images/generations',
        {
          model: 'dall-e-3',
          prompt: enhancedPrompt,
          n: 1,
          size: '1024x1024',
          quality: 'hd',
          style: 'natural'
        }
      );
      if (response.data.data && response.data.data.length > 0) {
        const temporaryImageUrl = response.data.data[0].url;
        this.logger.log(`Generated temporary image: ${temporaryImageUrl}`);
        
        // Download and store the image permanently in Cloudinary
        const permanentImageUrl = await this.storeImagePermanently(temporaryImageUrl, prompt);
        this.logger.log(`Stored permanent image: ${permanentImageUrl}`);
        
        return permanentImageUrl;
      }
      throw new Error('No image generated from DALL-E');
    } catch (error) {
      this.logger.error(`DALL-E image generation error: ${error.response?.data?.error?.message || error.message}`);
      throw error; 
    }
  }

  private async storeImagePermanently(temporaryUrl: string, prompt: string): Promise<string> {
    try {
      // Download the image from the temporary URL
      const imageResponse = await axios.get(temporaryUrl, {
        responseType: 'arraybuffer',
        timeout: 30000 // 30 second timeout
      });
      
      const imageBuffer = Buffer.from(imageResponse.data);
      
      // Upload to Cloudinary with AI-generated tag
      const result = await this.cloudinaryService.uploadImage(imageBuffer, {
        folder: 'astra-fashion/ai-generated',
        tags: ['ai-generated', 'dall-e', 'design'],
        context: {
          source: 'dall-e-3',
          prompt: prompt.substring(0, 500), // Truncate long prompts
          generated_at: new Date().toISOString()
        },
        transformation: {
          width: 1024,
          height: 1024,
          crop: 'fit',
          quality: 'auto',
          format: 'auto'
        }
      });
      
      return result.secure_url;
    } catch (error) {
      this.logger.error(`Failed to store image permanently: ${error.message}`);
      // Return the temporary URL as fallback, but log the issue
      this.logger.warn('Falling back to temporary URL - image may expire');
      return temporaryUrl;
    }
  }
  private async enhanceDesignPrompt(prompt: string, referenceImageBase64?: string): Promise<string> {
    try {
      const messages: any[] = [
        {
          role: 'system',
          content: 'You are an expert fashion design prompt engineer. Transform user descriptions into detailed, professional DALL-E prompts for fashion design generation. Focus on technical fashion details, fabric textures, silhouettes, and professional fashion illustration style.'
        },
        {
          role: 'user',
          content: `Transform this fashion design request into a detailed DALL-E prompt: "${prompt}"`
        }
      ];
      if (referenceImageBase64) {
        messages[1].content = {
          type: 'text',
          text: `Transform this fashion design request into a detailed DALL-E prompt, considering the reference image provided: "${prompt}"`
        };
        messages.push({
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${referenceImageBase64}`
              }
            }
          ]
        });
      }
      const response = await this.axiosInstance.post(
        this.apiUrl,
        {
          model: 'gpt-4o',
          messages,
          temperature: 0.7,
          max_tokens: 300,
        }
      );
      const enhancedPrompt = response.data.choices[0].message.content;
      return enhancedPrompt;
    } catch (error) {
      this.logger.error(`Prompt enhancement error: ${error.message}`);
      return `Professional fashion design: ${prompt}. High-quality fashion illustration, detailed garment construction, elegant silhouette, professional fashion sketch style, clean lines, detailed fabric textures, fashion runway presentation.`;
    }
  }
}