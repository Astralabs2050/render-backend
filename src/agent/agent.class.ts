import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

export default class Agent {
  model: any;

  constructor() {
    this.model = new OpenAI({
      apiKey: process.env.OPEN_API_KEY,
    });
  }

  public async generateDynamicQuestion(
    prompt: string,
    context?: string,
  ): Promise<string> {
    try {
      const systemMessage = context
  ? context === "greeting"
    ? "You are Astra, an AI assistant for the Astra application. Start by introducing yourself to the user before asking any questions. Be sure to greet them warmly and provide helpful context about how you can assist with their fashion design ideas."
    : `You are Astra, an AI assistant for the Astra application. You assist users in ${context}. Provide helpful, context-aware questions to guide the user.`
  : "You are Astra, an AI assistant for the Astra application. Guide the user through their process with relevant questions.";

      const response = await this.model.chat.completions.create({
        model: "gpt-3.5-turbo-0125",
        store: true,
        messages: [
          {
            role: "system",
            content:
              systemMessage +
              " Note: make the generated question less than 500 characters",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 50,
      });
      return response.choices[0].message["content"];
    } catch (error) {
      console.error("Error generating dynamic question:", error);
      return "Could you please provide the information requested?";
    }
  }

  public async validateUserResponse(
    prompt: string,
    response: string,
  ): Promise<boolean> {
    try {
      const validationPrompt = `Assess whether the user's response fulfills the main request in the prompt, regardless of additional conversational elements. A valid response must provide the requested information explicitly or implicitly.
    
    Prompt: ${prompt}
    
    Response: ${response}
    
    Reply with 'true' if the user's response satisfies the intent of the prompt, even if it's conversational or includes extra context. Reply with 'false' otherwise.`;

      const validationResponse = await this.model.chat.completions.create({
        model: "gpt-3.5-turbo-0125",
        messages: [
          {
            role: "system",
            content:
              "You are an evaluator that determines whether a user's response satisfies the intent of a given prompt, while allowing for conversational elements and indirect phrasing.",
          },
          { role: "user", content: validationPrompt },
        ],
        max_tokens: 10,
      });

      const result = validationResponse.choices[0].message["content"].trim();

      // Convert the response to a boolean value
      return result.toLowerCase() === "true";
    } catch (error) {
      console.error("Error validating user response:", error);
      return false; // Default to false if validation fails
    }
  }

  public async extractAnswer(
    prompt: string,
    response: string,
    dataType: string,
    formatOptions?: {
      regex?: string;
      caseStyle?: "lower" | "upper" | "title";
      customPrompt?: string;
    },
  ): Promise<any> {
    try {
      const customExtractionInstruction = formatOptions?.customPrompt
        ? `Additionally, format the answer as follows: ${formatOptions.customPrompt}`
        : "";

      const extractionPrompt = `Extract the answer from the user's response based on the following prompt and return it as a ${dataType}.
            
    Prompt: ${prompt}
    
    Response: ${response}
    
    Only provide the extracted value.${customExtractionInstruction}`;

      const extractionResponse = await this.model.chat.completions.create({
        model: "gpt-3.5-turbo-0125",
        messages: [
          {
            role: "system",
            content:
              "You are an assistant that extracts specific answers from user responses based on a given prompt. let the generated text be at most 500 characters long",
          },
          { role: "user", content: extractionPrompt },
        ],
        max_tokens: 30,
      });

      let extractedAnswer =
        extractionResponse.choices[0].message["content"].trim();
      console.log("Raw extractedAnswer:", extractedAnswer);

      // Apply regex formatting if specified
      if (formatOptions?.regex) {
        const regex = new RegExp(formatOptions.regex);
        const match = extractedAnswer.match(regex);
        extractedAnswer = match ? match[0] : extractedAnswer;
      }

      // Apply case formatting if specified
      if (formatOptions?.caseStyle) {
        if (formatOptions.caseStyle === "lower")
          extractedAnswer = extractedAnswer.toLowerCase();
        if (formatOptions.caseStyle === "upper")
          extractedAnswer = extractedAnswer.toUpperCase();
        if (formatOptions.caseStyle === "title") {
          extractedAnswer = extractedAnswer.replace(/\b\w/g, (char: any) =>
            char.toUpperCase(),
          );
        }
      }

      // Parse the extracted answer based on the expected data type
      switch (dataType.toLowerCase()) {
        case "number":
          return parseFloat(extractedAnswer);
        case "boolean":
          return extractedAnswer.toLowerCase() === "true";
        case "json":
          return JSON.parse(extractedAnswer);
        default:
          return extractedAnswer; // Default to string
      }
    } catch (error) {
      console.error("Error extracting answer:", error);
      return null; // Return null if extraction fails
    }
  }
  public async selectChoiceBasedOnIntent(
    prompt: string,
    choices: string[],
    userResponse: string,
  ): Promise<string> {
    try {
      const choicesList = choices.map((choice) => `"${choice}"`).join(", ");
      const selectionPrompt = `Based on the user's response, choose the most appropriate option from the given choices.
            
Prompt: ${prompt}

Choices: [${choicesList}]

User's Response: ${userResponse}

Only return the selected choice without any additional explanation. If none of the choices match, return "None".`;

      const response = await this.model.chat.completions.create({
        model: "gpt-3.5-turbo-0125",
        messages: [
          {
            role: "system",
            content:
              "You are a choice selector. Match user responses to the most relevant choice based on context and intent.",
          },
          { role: "user", content: selectionPrompt },
        ],
        max_tokens: 10,
      });

      const selectedChoice = response.choices[0].message["content"].trim();
      console.log("Selected Choice:", selectedChoice);
      return choices.includes(selectedChoice) ? selectedChoice : "None";
    } catch (error) {
      console.error("Error selecting choice based on intent:", error);
      return "None"; // Default to "None" if selection fails
    }
  }

  public async checkPositiveResponse(
    prompt: string,
    response: string,
  ): Promise<boolean> {
    try {
      console.log("prompt from agent", prompt, response);
      const validationPrompt = `Analyze the user's response to determine if it is positive or negative in the context of the question.

Question: ${prompt}

User's Response: ${response}

If the response is positive (indicating agreement, affirmation, or a constructive reply), reply with 'true'. If it is negative (indicating disagreement, rejection, or a lack of agreement), reply with 'false'.`;

      const validationResponse = await this.model.chat.completions.create({
        model: "gpt-3.5-turbo-0125",
        messages: [
          {
            role: "system",
            content:
              "You are a response evaluator. Determine if a user's response to a question is positive or negative based on the context.",
          },
          { role: "user", content: validationPrompt },
        ],
        max_tokens: 10,
      });

      const result = validationResponse.choices[0].message["content"].trim();

      // Convert the response to a boolean value
      return result.toLowerCase() === "true";
    } catch (error) {
      console.error("Error checking positive response:", error);
      return false; // Default to false if validation fails
    }
  }

  public async generateSentenceBasedOnContext(
    prompt: string,
    context?: string,
  ): Promise<string> {
    try {
      const systemMessage = context
        ? `You are a creative sentence generator for the Astra application. Generate a sentence that reflects the context: ${context}`
        : "You are a creative sentence generator for the Astra application. Generate sentences based on the user's prompt.";

      const response = await this.model.chat.completions.create({
        model: "gpt-3.5-turbo-0125",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: prompt },
        ],
        max_tokens: 50,
      });

      return response.choices[0].message["content"].trim();
    } catch (error) {
      console.error("Error generating sentence based on context:", error);
      return "Unable to generate a sentence based on the provided context.";
    }
  }
}
