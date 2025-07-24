import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
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

    // Create axios instance with headers
    this.axiosInstance = axios.create({
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });
  }

  async generateChatResponse(messages: any[]): Promise<string> {
    try {
      const response = await this.axiosInstance.post(
        this.apiUrl,
        {
          model: 'gpt-4o',
          messages,
          temperature: 0.7,
          max_tokens: 500,
        },
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

  async generateDesignImage(prompt: string, referenceImageBase64?: string): Promise<string> {
    try {
      // Create a detailed fashion design prompt
      const fashionPrompt = `Fashion design sketch: ${prompt}. Professional fashion illustration, clean lines, detailed garment construction, fashion croquis style, high quality, detailed fabric textures, elegant pose, fashion runway style.`;

      const response = await this.axiosInstance.post(
        'https://api.openai.com/v1/images/generations',
        {
          model: 'dall-e-3',
          prompt: fashionPrompt,
          n: 1,
          size: '1024x1024',
          quality: 'standard',
          style: 'natural'
        }
      );

      if (response.data.data && response.data.data.length > 0) {
        const imageUrl = response.data.data[0].url;
        this.logger.log(`Generated design image: ${imageUrl}`);
        return imageUrl;
      }

      throw new Error('No image generated');
    } catch (error) {
      this.logger.error(`DALL-E image generation error: ${error.message}`);
      // Return a placeholder image URL or throw error
      return 'https://via.placeholder.com/1024x1024/f0f0f0/666666?text=Design+Generation+Failed';
    }
  }
}