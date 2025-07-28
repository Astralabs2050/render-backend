import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
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
  ) {
    this.apiKey = this.configService.get<string>('OPENAI_API_KEY');

    // Create axios instance with headers and timeout
    this.axiosInstance = axios.create({
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      timeout: 60000, // 60 seconds
    });
  }

  async generateChatResponse(messages: any[]): Promise<string> {
    try {
      // Enhanced system message for fashion design context
      const enhancedMessages = [
        {
          role: 'system',
          content: 'You are an expert fashion design AI assistant. You help creators and makers collaborate on fashion projects. You can analyze designs, suggest improvements, provide technical fashion advice, discuss trends, materials, construction techniques, and help with design ideation. You understand both creative and technical aspects of fashion design.'
        },
        ...messages.slice(1) // Skip original system message if present
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
      this.logger.log(`Generating image for prompt: ${prompt}`);
      
      // Use GPT-4o to enhance the prompt for better image generation
      const enhancedPrompt = await this.enhanceDesignPrompt(prompt, referenceImageBase64);
      this.logger.log(`Enhanced prompt: ${enhancedPrompt}`);

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

      this.logger.log(`DALL-E response:`, response.data);

      if (response.data.data && response.data.data.length > 0) {
        const imageUrl = response.data.data[0].url;
        this.logger.log(`Generated design image: ${imageUrl}`);
        return imageUrl;
      }

      throw new Error('No image generated from DALL-E');
    } catch (error) {
      this.logger.error(`DALL-E image generation error:`, error.response?.data || error.message);
      throw error; // Don't return placeholder, let the caller handle the error
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

      // If reference image is provided, include it in the analysis
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
      this.logger.log(`Enhanced prompt: ${enhancedPrompt}`);
      return enhancedPrompt;
    } catch (error) {
      this.logger.error(`Prompt enhancement error: ${error.message}`);
      // Fallback to basic enhancement
      return `Professional fashion design: ${prompt}. High-quality fashion illustration, detailed garment construction, elegant silhouette, professional fashion sketch style, clean lines, detailed fabric textures, fashion runway presentation.`;
    }
  }
}