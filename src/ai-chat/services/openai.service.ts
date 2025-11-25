import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { CloudinaryService } from '../../common/services/cloudinary.service';
import { PromptService } from './prompt.service';
import { GoogleGenAI } from '@google/genai';
@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private readonly apiKey: string;
  private readonly apiUrl = 'https://api.openai.com/v1/chat/completions';
  private readonly axiosInstance: AxiosInstance;
  private readonly geminiClient: GoogleGenAI;
  private readonly geminiApiKey: string;
  constructor(
    private configService: ConfigService,
    private promptService: PromptService,
    private cloudinaryService: CloudinaryService,
  ) {
    this.apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.geminiApiKey = this.configService.get<string>('GEMINI_API_KEY');
    this.axiosInstance = axios.create({
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });
    // Initialize Gemini client for image generation
    this.geminiClient = new GoogleGenAI({ apiKey: this.geminiApiKey });
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

      // Use Gemini for image generation
      const response: any = await this.geminiClient.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: enhancedPrompt,
      });

      // Gemini returns images as base64 in response.parts
      if (response.parts && Array.isArray(response.parts)) {
        for (const part of response.parts) {
          if (part.inlineData && part.inlineData.data) {
            // Convert base64 to buffer
            const imageBuffer = Buffer.from(part.inlineData.data, 'base64');

            // Upload to Cloudinary directly
            const permanentImageUrl = await this.cloudinaryService.uploadImage(imageBuffer, {
              folder: 'astra-fashion/ai-generated',
              tags: ['ai-generated', 'gemini', 'design'],
              context: {
                source: 'gemini_2_5_flash',
                prompt: prompt.substring(0, 100).replace(/[^a-zA-Z0-9\s]/g, '_'),
                generated_at: new Date().toISOString().replace(/[^a-zA-Z0-9]/g, '_')
              },
              transformation: {
                width: 1024,
                height: 1024,
                crop: 'fit',
                quality: 'auto',
                format: 'auto'
              }
            });

            this.logger.log(`Generated and stored Gemini image: ${permanentImageUrl.secure_url}`);
            return permanentImageUrl.secure_url;
          }
        }
      }
      throw new Error('No image generated from Gemini');
    } catch (error) {
      this.logger.error(`Gemini image generation error: ${error.message}`);
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
          source: 'dall_e_3',
          prompt: prompt.substring(0, 100).replace(/[^a-zA-Z0-9\s]/g, '_'), // Sanitize prompt
          generated_at: new Date().toISOString().replace(/[^a-zA-Z0-9]/g, '_')
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
  async generateConsistentDesignImage(prompt: string, baseStylePrompt?: string, variationIndex: number = 0, referenceImageBase64?: string): Promise<string> {
    try {
      const enhancedPrompt = await this.enhanceConsistentDesignPrompt(prompt, baseStylePrompt, variationIndex, referenceImageBase64);

      // Use Gemini for image generation
      const response: any = await this.geminiClient.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: enhancedPrompt,
      });

      // Gemini returns images as base64 in response.parts
      if (response.parts && Array.isArray(response.parts)) {
        for (const part of response.parts) {
          if (part.inlineData && part.inlineData.data) {
            // Convert base64 to buffer
            const imageBuffer = Buffer.from(part.inlineData.data, 'base64');

            // Upload to Cloudinary directly
            const permanentImageUrl = await this.cloudinaryService.uploadImage(imageBuffer, {
              folder: 'astra-fashion/ai-generated',
              tags: ['ai-generated', 'gemini', 'design', `variation-${variationIndex + 1}`],
              context: {
                source: 'gemini_2_5_flash',
                prompt: prompt.substring(0, 100).replace(/[^a-zA-Z0-9\s]/g, '_'),
                variation_index: variationIndex.toString(),
                generated_at: new Date().toISOString().replace(/[^a-zA-Z0-9]/g, '_')
              },
              transformation: {
                width: 1024,
                height: 1024,
                crop: 'fit',
                quality: 'auto',
                format: 'auto'
              }
            });

            this.logger.log(`Generated consistent variation ${variationIndex + 1}: ${permanentImageUrl.secure_url}`);
            return permanentImageUrl.secure_url;
          }
        }
      }
      throw new Error('No image generated from Gemini');
    } catch (error) {
      this.logger.error(`Gemini consistent image generation error: ${error.message}`);
      throw error;
    }
  }

  private async enhanceDesignPrompt(prompt: string, referenceImageBase64?: string): Promise<string> {
    try {
      const messages: any[] = [
        {
          role: 'system',
          content: 'You are an expert fashion design prompt engineer. Transform user descriptions into detailed, professional Gemini image generation prompts for fashion design. Focus on technical fashion details, fabric textures, silhouettes, and professional fashion illustration style.'
        },
        {
          role: 'user',
          content: `Transform this fashion design request into a detailed Gemini image generation prompt: "${prompt}"`
        }
      ];
      if (referenceImageBase64) {
        messages[1].content = {
          type: 'text',
          text: `Transform this fashion design request into a detailed Gemini image generation prompt, considering the reference image provided: "${prompt}"`
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

  private async enhanceConsistentDesignPrompt(prompt: string, baseStylePrompt?: string, variationIndex: number = 0, referenceImageBase64?: string): Promise<string> {
    try {
      const consistencyInstructions = baseStylePrompt ?
        `Maintain the same art style, lighting, and visual aesthetic as established in the base design: "${baseStylePrompt}". ` :
        'Establish a consistent art style for this design series. ';

      const variationInstructions = [
        'Show the design from a front view with clean background',
        'Show the design from a 3/4 angle view with clean background',
        'Show the design with detailed close-up of key features with clean background'
      ];

      const messages: any[] = [
        {
          role: 'system',
          content: `You are an expert fashion design prompt engineer. Create consistent Gemini image generation prompts that maintain the same artistic style across variations. ${consistencyInstructions}Focus on: same lighting style, same illustration technique, same color palette approach, same level of detail, same background style.`
        },
        {
          role: 'user',
          content: `Create variation ${variationIndex + 1} of this fashion design: "${prompt}". ${variationInstructions[variationIndex] || variationInstructions[0]}. Maintain consistent artistic style.`
        }
      ];

      if (referenceImageBase64) {
        messages[1].content += ' Consider the reference image provided for fabric/texture details.';
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
          temperature: 0.3,
          max_tokens: 300,
        }
      );

      const enhancedPrompt = response.data.choices[0].message.content;
      return enhancedPrompt;
    } catch (error) {
      this.logger.error(`Consistent prompt enhancement error: ${error.message}`);
      const fallbackStyles = [
        'front view, professional fashion photography style',
        '3/4 angle view, professional fashion photography style',
        'detailed close-up view, professional fashion photography style'
      ];
      return `Professional fashion design: ${prompt}. ${fallbackStyles[variationIndex] || fallbackStyles[0]}, consistent lighting, clean white background, high-quality fashion illustration, detailed garment construction.`;
    }
  }

  // ============ DALL-E (OpenAI) Image Generation Methods ============

  async generateDesignImageWithDALLE(prompt: string): Promise<string> {
    try {
      const enhancedPrompt = await this.enhanceDesignPromptForDALLE(prompt);

      this.logger.log(`Generating DALL-E image with prompt: ${enhancedPrompt.substring(0, 100)}...`);

      const response = await this.axiosInstance.post(
        'https://api.openai.com/v1/images/generations',
        {
          model: 'dall-e-3',
          prompt: enhancedPrompt,
          n: 1,
          size: '1024x1024',
          quality: 'standard',
          response_format: 'url'
        }
      );

      const temporaryUrl = response.data.data[0].url;
      this.logger.log(`DALL-E image generated: ${temporaryUrl}`);

      // Store permanently on Cloudinary
      const permanentUrl = await this.storeImagePermanently(temporaryUrl, prompt);
      return permanentUrl;
    } catch (error) {
      this.logger.error(`DALL-E image generation error: ${error.message}`);
      throw error;
    }
  }

  async generateConsistentDesignImageWithDALLE(prompt: string, baseStylePrompt?: string, variationIndex: number = 0): Promise<string> {
    try {
      const enhancedPrompt = await this.enhanceConsistentDesignPromptForDALLE(prompt, baseStylePrompt, variationIndex);

      this.logger.log(`Generating DALL-E variation ${variationIndex + 1}: ${enhancedPrompt.substring(0, 100)}...`);

      const response = await this.axiosInstance.post(
        'https://api.openai.com/v1/images/generations',
        {
          model: 'dall-e-3',
          prompt: enhancedPrompt,
          n: 1,
          size: '1024x1024',
          quality: 'standard',
          response_format: 'url'
        }
      );

      const temporaryUrl = response.data.data[0].url;
      this.logger.log(`DALL-E variation ${variationIndex + 1} generated: ${temporaryUrl}`);

      // Store permanently on Cloudinary
      const permanentUrl = await this.storeImagePermanently(temporaryUrl, prompt);
      return permanentUrl;
    } catch (error) {
      this.logger.error(`DALL-E consistent image generation error: ${error.message}`);
      throw error;
    }
  }

  private async enhanceDesignPromptForDALLE(prompt: string): Promise<string> {
    try {
      const response = await this.axiosInstance.post(
        this.apiUrl,
        {
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'You are an expert fashion design prompt engineer. Transform user descriptions into detailed, professional DALL-E 3 image generation prompts for fashion design. Focus on technical fashion details, fabric textures, silhouettes, and professional fashion illustration style. Keep prompts under 1000 characters.'
            },
            {
              role: 'user',
              content: `Transform this fashion design request into a detailed DALL-E 3 image generation prompt: "${prompt}"`
            }
          ],
          temperature: 0.7,
          max_tokens: 300,
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      this.logger.error(`DALL-E prompt enhancement error: ${error.message}`);
      return `Professional fashion design: ${prompt}. High-quality fashion illustration, detailed garment construction, elegant silhouette, professional fashion sketch style, clean lines, detailed fabric textures, fashion runway presentation, studio lighting, white background.`;
    }
  }

  private async enhanceConsistentDesignPromptForDALLE(prompt: string, baseStylePrompt?: string, variationIndex: number = 0): Promise<string> {
    try {
      const consistencyInstructions = baseStylePrompt ?
        `Maintain the same art style, lighting, and visual aesthetic as: "${baseStylePrompt}". ` :
        'Establish a consistent art style. ';

      const variationInstructions = [
        'front view with white background',
        '3/4 angle view with white background',
        'detailed close-up of key design features with white background'
      ];

      const response = await this.axiosInstance.post(
        this.apiUrl,
        {
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are an expert fashion design prompt engineer. Create consistent DALL-E 3 prompts that maintain the same artistic style across variations. ${consistencyInstructions}Focus on: same lighting, same illustration technique, same color palette, same level of detail, same background. Keep under 1000 characters.`
            },
            {
              role: 'user',
              content: `Create variation ${variationIndex + 1} of this fashion design: "${prompt}". ${variationInstructions[variationIndex] || variationInstructions[0]}. Maintain consistent artistic style.`
            }
          ],
          temperature: 0.3,
          max_tokens: 300,
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      this.logger.error(`DALL-E consistent prompt enhancement error: ${error.message}`);
      const fallbackStyles = [
        'front view, professional fashion photography',
        '3/4 angle view, professional fashion photography',
        'detailed close-up view, professional fashion photography'
      ];
      return `Professional fashion design: ${prompt}. ${fallbackStyles[variationIndex] || fallbackStyles[0]}, consistent lighting, white background, high-quality fashion illustration, detailed garment construction.`;
    }
  }
}