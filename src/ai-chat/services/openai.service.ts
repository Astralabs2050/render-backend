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
  private geminiClient?: GoogleGenAI;
  private geminiApiKey?: string;
  constructor(
    private configService: ConfigService,
    private promptService: PromptService,
    private cloudinaryService: CloudinaryService,
  ) {
    this.apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.geminiApiKey = (
      this.configService.get<string>('GEMINI_API_KEY') ||
      process.env.GEMINI_API_KEY ||
      ''
    ).trim() || undefined;
    this.axiosInstance = axios.create({
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });
    if (this.geminiApiKey) {
      this.geminiClient = new GoogleGenAI({ apiKey: this.geminiApiKey });
      this.logger.log('Gemini image generation is enabled');
    } else {
      this.logger.warn('GEMINI_API_KEY is not set — Gemini image generation is disabled');
    }
  }

  private assertGemini(): GoogleGenAI {
    if (!this.geminiClient) {
      const key =
        this.configService.get<string>('GEMINI_API_KEY') ||
        process.env.GEMINI_API_KEY;
      if (key) {
        this.geminiApiKey = key;
        this.geminiClient = new GoogleGenAI({ apiKey: key });
      }
    }
    if (!this.geminiClient || !this.geminiApiKey) {
      throw new Error(
        'Gemini image generation is not configured. Set GEMINI_API_KEY in render-backend/.env',
      );
    }
    return this.geminiClient;
  }

  private extractGeminiImageB64(response: any): string | undefined {
    const parts = [
      ...(Array.isArray(response?.parts) ? response.parts : []),
      ...(Array.isArray(response?.candidates?.[0]?.content?.parts)
        ? response.candidates[0].content.parts
        : []),
    ];
    for (const part of parts) {
      const data = part?.inlineData?.data || part?.inline_data?.data;
      if (data) return data;
    }
    return undefined;
  }

  private async persistOpenAIImage(image: { url?: string; b64_json?: string }, prompt: string): Promise<string> {
    if (image?.b64_json) {
      const imageBuffer = Buffer.from(image.b64_json, 'base64');
      const uploaded = await this.cloudinaryService.uploadImage(imageBuffer, {
        folder: 'astra-fashion/ai-generated',
        tags: ['ai-generated', 'openai', 'design'],
      });
      return uploaded.secure_url;
    }
    if (image?.url) {
      return this.storeImagePermanently(image.url, prompt);
    }
    throw new Error('OpenAI image response had neither url nor b64_json');
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
                required: ['name', 'category', 'timeframe', 'colors', 'description']
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
        timeframe: 7,
        colors: ['white'],
        description: prompt
      };
    } catch (error) {
      this.logger.error(`OpenAI metadata extraction error: ${error.message}`);
      return {
        name: 'Custom Design',
        category: 'Dress',
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
        },
        { timeout: 12000 },
      );
      return response.data.choices[0].message.content;
    } catch (error) {
      this.logger.error(`Response generation error: ${error.message}`);
      return "I'm having trouble right now. Please try again.";
    }
  }
  private parseReferenceImage(input?: string): { mimeType: string; data: string } | null {
    if (!input) return null;
    const match = input.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s);
    if (match) return { mimeType: match[1], data: match[2] };
    const stripped = input.replace(/\s/g, '');
    if (!stripped) return null;
    return { mimeType: 'image/jpeg', data: stripped };
  }

  private buildGeminiDesignPrompt(
    prompt: string,
    variationIndex: number,
    baseStylePrompt?: string,
  ): string {
    const views = [
      'front view of the full outfit on a faceless fashion mannequin',
      'three-quarter angle view of the same outfit on a faceless fashion mannequin',
      'close-up of fabric, construction, and silhouette of the same outfit',
    ];
    const styleLock = baseStylePrompt
      ? ` Keep the same silhouette, colour palette, and garment type as: ${baseStylePrompt}.`
      : '';
    return (
      `Professional editorial fashion illustration. ${prompt}. ` +
      `${views[variationIndex] || views[0]}.${styleLock} ` +
      'Clean white studio background, consistent lighting, garment-focused, no celebrity likeness.'
    );
  }

  private async persistGeminiImage(
    imageB64: string,
    prompt: string,
    variationIndex?: number,
  ): Promise<string> {
    const imageBuffer = Buffer.from(imageB64, 'base64');
    const permanentImageUrl = await this.cloudinaryService.uploadImage(imageBuffer, {
      folder: 'astra-fashion/ai-generated',
      tags: [
        'ai-generated',
        'gemini',
        'design',
        ...(variationIndex != null ? [`variation-${variationIndex + 1}`] : []),
      ],
      context: {
        source: 'gemini_flash_image',
        prompt: prompt.substring(0, 100).replace(/[^a-zA-Z0-9\s]/g, '_'),
        generated_at: new Date().toISOString().replace(/[^a-zA-Z0-9]/g, '_'),
      },
      transformation: {
        width: 1024,
        height: 1024,
        crop: 'fit',
        quality: 'auto',
        format: 'auto',
      },
    });
    return permanentImageUrl.secure_url;
  }

  private async generateGeminiFashionImage(
    prompt: string,
    variationIndex = 0,
    referenceImageBase64?: string,
    baseStylePrompt?: string,
  ): Promise<string> {
    const client = this.assertGemini();
    const text = this.buildGeminiDesignPrompt(prompt, variationIndex, baseStylePrompt);
    const ref = this.parseReferenceImage(referenceImageBase64);
    const contents = ref
      ? [
          {
            role: 'user',
            parts: [
              { text: `${text} Match the attached fabric or reference photo.` },
              { inlineData: { mimeType: ref.mimeType, data: ref.data } },
            ],
          },
        ]
      : text;

    const models = [
      'gemini-2.5-flash-image',
      'gemini-2.0-flash-preview-image-generation',
    ];
    let lastError: any;
    for (const model of models) {
      try {
        this.logger.log(`Generating Gemini image (${model}) variation ${variationIndex + 1}`);
        const response: any = await client.models.generateContent({
          model,
          contents,
          config: { responseModalities: ['IMAGE', 'TEXT'] },
        });
        const imageB64 = this.extractGeminiImageB64(response);
        if (!imageB64) throw new Error('No image in Gemini response');
        const url = await this.persistGeminiImage(imageB64, prompt, variationIndex);
        this.logger.log(`Gemini ${model} variation ${variationIndex + 1}: ${url}`);
        return url;
      } catch (error: any) {
        lastError = error;
        this.logger.warn(`${model} failed: ${error.message}`);
      }
    }
    throw lastError || new Error('Gemini image generation failed');
  }

  async generateDesignImage(prompt: string, referenceImageBase64?: string): Promise<string> {
    return this.generateGeminiFashionImage(prompt, 0, referenceImageBase64);
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
      return await this.generateGeminiFashionImage(
        prompt,
        variationIndex,
        referenceImageBase64,
        baseStylePrompt,
      );
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
          content: `You are an expert fashion design prompt engineer. Create consistent image generation prompts that maintain the same artistic style across variations. ${consistencyInstructions}CRITICAL: All three variations MUST be uniform in style and hyper-realistic. Focus on: same lighting style, same illustration technique, same color palette approach, same level of detail, same background style, photorealistic rendering, professional fashion photography quality.`
        },
        {
          role: 'user',
          content: `Create variation ${variationIndex + 1} of this fashion design: "${prompt}". ${variationInstructions[variationIndex] || variationInstructions[0]}. MUST maintain consistent artistic style and hyper-realistic appearance across all variations.`
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
        'front view, hyper-realistic professional fashion photography style',
        '3/4 angle view, hyper-realistic professional fashion photography style',
        'detailed close-up view, hyper-realistic professional fashion photography style'
      ];
      return `Professional fashion design: ${prompt}. ${fallbackStyles[variationIndex] || fallbackStyles[0]}, consistent uniform lighting, clean white background, hyper-realistic photorealistic rendering, detailed garment construction, professional studio quality.`;
    }
  }

  // ============ OpenAI Image Generation (gpt-image-1, then DALL-E 3) ============

  private async generateOpenAIImageFromPrompt(prompt: string, label: string): Promise<string> {
    const attempts: Array<{ model: string; body: Record<string, unknown> }> = [
      {
        model: 'gpt-image-1',
        body: {
          model: 'gpt-image-1',
          prompt,
          n: 1,
          size: '1024x1024',
        },
      },
      {
        model: 'dall-e-3',
        body: {
          model: 'dall-e-3',
          prompt,
          n: 1,
          size: '1024x1024',
          quality: 'standard',
        },
      },
    ];

    let lastError: any;
    for (const attempt of attempts) {
      try {
        this.logger.log(`Generating ${label} with ${attempt.model}`);
        const response = await this.axiosInstance.post(
          'https://api.openai.com/v1/images/generations',
          attempt.body,
          { timeout: 120000 },
        );
        const image = response.data?.data?.[0];
        this.logger.log(`${attempt.model} ${label} generated`);
        return this.persistOpenAIImage(image, prompt);
      } catch (error: any) {
        lastError = error;
        const details = error.response?.data
          ? JSON.stringify(error.response.data)
          : error.message;
        this.logger.warn(`${attempt.model} failed for ${label}: ${details}`);
      }
    }
    throw lastError || new Error('OpenAI image generation failed');
  }

  async generateDesignImageWithDALLE(prompt: string): Promise<string> {
    const enhancedPrompt = await this.enhanceDesignPromptForDALLE(prompt);
    return this.generateOpenAIImageFromPrompt(enhancedPrompt, 'image');
  }

  async generateConsistentDesignImageWithDALLE(prompt: string, baseStylePrompt?: string, variationIndex: number = 0): Promise<string> {
    const enhancedPrompt = await this.enhanceConsistentDesignPromptForDALLE(prompt, baseStylePrompt, variationIndex);
    return this.generateOpenAIImageFromPrompt(
      String(enhancedPrompt || prompt).slice(0, 3900),
      `variation ${variationIndex + 1}`,
    );
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
              content: `You are an expert fashion design prompt engineer. Write a DALL-E 3 prompt for a fashion garment illustration. Do NOT mention photorealistic people, faces, or celebrities. Show the outfit on a faceless fashion mannequin or as a flat fashion sketch. Keep under 900 characters. ${consistencyInstructions}`
            },
            {
              role: 'user',
              content: `Variation ${variationIndex + 1} of this outfit: "${prompt}". ${variationInstructions[variationIndex] || variationInstructions[0]}. Editorial fashion illustration, studio lighting, white background, garment details only.`
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
        'front view fashion illustration on a faceless mannequin, white background',
        '3/4 angle fashion illustration on a faceless mannequin, white background',
        'detail view of garment construction, fashion illustration, white background'
      ];
      return `Fashion garment illustration: ${prompt}. ${fallbackStyles[variationIndex] || fallbackStyles[0]}. No visible face, editorial studio lighting.`.slice(0, 900);
    }
  }
}