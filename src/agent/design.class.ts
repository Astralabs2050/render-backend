import { DesignModel, UsersModel } from "../model";
import { Socket } from "socket.io";
import DesignService from "../service/design.service";
import JobService from "../service/job.service";

export interface AgentType {
  generateDynamicQuestion(prompt: string, context?: string): Promise<string>;
  validateUserResponse(prompt: string, response: string): Promise<boolean>;
  extractAnswer(
    prompt: string,
    response: string,
    type: string,
    formatOptions?: {
      regex?: string;
      caseStyle?: "lower" | "upper" | "title";
      customPrompt?: string;
    },
  ): Promise<string>;
  checkPositiveResponse(
    prompt: string,
    response: string,
    type: string,
  ): Promise<string>;
  generateSentenceBasedOnContext(
    prompt: string,
    context?: string,
  ): Promise<string>;
  selectChoiceBasedOnIntent(
    prompt: string,
    choices: string[],
    response: string,
  ): Promise<string>;
}

interface User {
  dataValues: {
    city?: string;
  };
}

interface SocketEventData {
  response: string;
}

export default class DesignAgent {
  agent: AgentType;
  socket: any;

  constructor(agent: AgentType, socket: Socket) {
    this.agent = agent;
    this.socket = socket;
  }

  /**
   * Handles errors by generating and emitting an appropriate error message.
   */
  async handleError(prompt: string, nextEvent: string): Promise<void> {
    try {
      const errorMessage = await this.agent.generateDynamicQuestion(
        prompt,
        "error message",
      );
      this.socket.emit("error", {
        content: errorMessage,
        status: false,
        nextevent: nextEvent,
      });
    } catch (error) {
      console.error("Error handling error response:", error);
      this.socket.emit("error", {
        content: "Oops! Something went wrong. Please try again.",
        status: false,
        nextevent: nextEvent,
      });
    }
  }

  /**
   * Handles the fashion design generation flow by interacting with the user step-by-step.
   */
  async generateDesign(): Promise<void> {
    let prompt: string;
    let userPrompt = "";
    let materialDelivery: boolean = false;
    const user: User | null = await UsersModel.findOne({
      where: { id: this.socket?.user?.id },
    });
    const userCity = user?.dataValues?.city;
    let generatedDesignId = "";
    let budget: string;
    let generatedImage :any
    const events = {
      /**
       * Sends a greeting message personalized with the user's city (if available).
       */
      greeting: async (): Promise<void> => {
        const greetingPrompt = `Hi, I'm Astra, your AI assistant here to help you bring your fashion design ideas to life. ${
          userCity ? `I see you're from ${userCity}.` : ""
        } I’ll help you find local makers who can bring your vision to reality. What fashion design would you like to create?`;
        
        const greeting = await this.agent.generateDynamicQuestion(
          greetingPrompt,
          "greeting"
        );
        prompt = greeting;
        this.socket.emit("ask", {
          content: greeting,
          status: true,
          nextevent: "DesignPrompt",
        });
      },

      /**
       * Handles the user's initial design prompt.
       */
      design: async (designPrompt: string): Promise<void> => {
        if (!designPrompt) {
          await this.handleError(
            "Could you please provide some design ideas?",
            "DesignPrompt",
          );
          this.socket.once("DesignPrompt", (data: SocketEventData) =>
            events.design(data.response),
          );
          return;
        }
        console.log("prompt, designPrompt", prompt, designPrompt);
        const isValid = await this.agent.validateUserResponse(
          prompt,
          designPrompt,
        );
        if (!isValid) {
          await this.handleError(
            "Could you please provide some design ideas?",
            "DesignPrompt",
          );
          this.socket.once("DesignPrompt", (data: SocketEventData) =>
            events.design(data.response),
          );
          return;
        }

        userPrompt = designPrompt;

        const patternPrompt = `Ask the user if thier have a  material for thier design dont offer any recommendation and dont ask any other question. the users design ${userPrompt}`;
        const materialPrompt =
          await this.agent.generateDynamicQuestion(patternPrompt);
        prompt = materialPrompt;

        this.socket.emit("ask", {
          content: materialPrompt,
          status: true,
          nextevent: "PatternPrompt",
        });
      },

      /**
       * Handles the user's response regarding patterns or materials.
       */
      pattern: async (patternPrompt: string): Promise<void> => {
        if (!patternPrompt) {
          await this.handleError(
            `Ask the user if thier have a  material for thier design dont offer any recommendation and dont ask any other question. the users design ${userPrompt}`,
            "PatternPrompt",
          );
          this.socket.once("PatternPrompt", (data: SocketEventData) =>
            events.pattern(data.response),
          );
          return;
        }
        console.log("  prompt,patternPrompt,",prompt,patternPrompt)
        const patternResponse = await this.agent.checkPositiveResponse(
          prompt,
          patternPrompt,
          "string",
        );
        console.log("Pattern Response:", patternResponse);
        // the next event will collect the pattern via base64 or url
        if (patternResponse) {
          const materialDeliveryPrompt =
            "Ask the user if thier Will be able to deliver the fabric to the maker, or do thier prefer the maker to pick it up from thier location";
          const DeliveryPrompt = await this.agent.generateDynamicQuestion(
            materialDeliveryPrompt,
          );
          prompt = DeliveryPrompt;
          this.socket.emit("ask", {
            content: DeliveryPrompt,
            status: true,
            nextevent: "materialDelivery",
          });
        } else {
          // tell the user that thier design is been created
          const generationPrompt =
            "tell the user that thier design is been generated";
          const genPrompt = await this.agent.generateSentenceBasedOnContext(
            generationPrompt,
            "design is been generated",
          );
          this.socket.emit("ask", {
            content: genPrompt,
            status: true,
            nextevent: "",
          });

          try {
            const newDesign = await DesignService.generateNewDesign(
              {
                prompt: userPrompt,
              },
              this.socket?.user?.id,
            );
            if (!newDesign?.status) {
              const errorPrompt = `tell the user that thier was an error creating design this is the error ${newDesign?.message}. tell user to try again`;
              await this.handleError(errorPrompt, "DesignPrompt");
              this.socket.once("DesignPrompt", (data: SocketEventData) =>
                events.pattern(data.response),
              );
            }
            generatedImage = newDesign?.data?.images
            generatedDesignId = newDesign?.data?.designId as string;
            const generationPrompt = `tell the user that thier design has been generated and ask them to  select an outfit thier prefer of of the generated design ${newDesign?.data?.images}`;
            const succPrompt = await this.agent.generateDynamicQuestion(
              generationPrompt,
              "design successfully generated",
            );
            prompt = succPrompt;
            this.socket.emit("success", {
              content: succPrompt,
              data: newDesign,
              status: true,
              nextevent: "selectDesign",
            });
          } catch (err: any) {
            console.log("Error while creating design", err);
            const errorPrompt = `tell the user that thier was an error creating design this is the error ${err?.message}. tell user to try again`;
            await this.handleError(errorPrompt, "DesignPrompt");
            this.socket.once("DesignPrompt", (data: SocketEventData) =>
              events.pattern(data.response),
            );
            return;
          }
        }
        // Additional steps can be added here as needed.
      },
      materialDelivery: async (response: string) => {
        if (!response) {
          await this.handleError(
            "Ask the user if thier Will be able to deliver the fabric to the maker, or do thier prefer the maker to pick it up from thier location",
            "materialDelivery",
          );
          this.socket.once("materialDelivery", (data: SocketEventData) =>
            events.materialDelivery(data.response),
          );
          return;
        }
        const getUserChoice = await this.agent.selectChoiceBasedOnIntent(
          prompt,
          ["deliver", "pickup"],
          response,
        );
        console.log("User Choice:", getUserChoice);
        if (getUserChoice === "deliver") {
          materialDelivery = true;
        }
        const patternPrompt =
          "Ask the user to upload an image of the specific pattern or material in mind for thier design?";
        const materialPrompt =
          await this.agent.generateDynamicQuestion(patternPrompt);
        prompt = materialPrompt;
        this.socket.emit("ask", {
          content: materialPrompt,
          status: true,
          nextevent: "materialUpload",
        });
      },
      material: async (pattern: string) => {
        if (!pattern) {
          await this.handleError(
            "Ask the user to upload an image of the specific pattern or material in mind for thier design?",
            "materialUpload",
          );
          this.socket.once("materialUpload", (data: SocketEventData) =>
            events.pattern(data.response),
          );
          return;
        }

        // tell the user that thier design is been created
        const generationPrompt =
          "send a message to the user that thier design is been generated";
        const genPrompt =
          await this.agent.generateSentenceBasedOnContext(generationPrompt);
        this.socket.emit("ask", {
          content: genPrompt,
          status: true,
          nextevent: "",
        });
        try {
          const newDesign = await DesignService.generateNewDesign(
            {
              prompt: userPrompt,
              image: pattern,
              fabricDelivary: materialDelivery,
            },
            this.socket?.user?.id,
          );
          if (!newDesign?.status) {
            const errorPrompt = `tell the user that thier was an error creating design this is the error ${newDesign?.message}. tell user to try again`;
            await this.handleError(errorPrompt, "DesignPrompt");
            this.socket.once("DesignPrompt", (data: SocketEventData) =>
              events.pattern(data.response),
            );
          }
          generatedImage = newDesign?.data?.images
          const generationPrompt = `tell the user that thier design has been generated and ask them to  select an outfit thier prefer of of the generated design ${newDesign?.data?.images}`;
          const succPrompt = await this.agent.generateDynamicQuestion(
            generationPrompt,
            "design successfully generated",
          );
          generatedImage = newDesign?.data?.images
          generatedDesignId = newDesign?.data?.designId as string;
          prompt = succPrompt;
          this.socket.emit("success", {
            content: succPrompt,
            data: newDesign,
            status: true,
            nextevent: "selectDesign",
          });
        } catch (err: any) {
          console.log("Error while creating design", err);
          const errorPrompt = `tell the user that thier was an error creating design this is the error ${err?.message}. tell user to try again`;
          await this.handleError(errorPrompt, "DesignPrompt");
          this.socket.once("DesignPrompt", (data: SocketEventData) =>
            events.pattern(data.response),
          );
          return;
        }
      },
      selectDesign: async (response: string) => {
        if (!response) {
          await this.handleError(
            "Ask the user to select the outfit thier prefer",
            "selectDesign",
          );
          this.socket.once("selectDesign", (data: SocketEventData) =>
            events.selectDesign(data.response),
          );
          return;
        }
        console.log("design 11", generatedDesignId);
        const isValidResponse = await this.agent.validateUserResponse(
          prompt + " note thier are only 2 outfit present",
          response,
        );
        if (!isValidResponse) {
          await this.handleError(
            "Ask the user to select the outfit thier prefer",
            "selectDesign",
          );
          this.socket.once("selectDesign", (data: SocketEventData) =>
            events.selectDesign(data?.response),
          );
          return;
        }
        const userChoice = await this.agent.selectChoiceBasedOnIntent(
          prompt + " note thier are only 2 outfit present",
          ["1", "2"],
          response,
        );
        console.log("userChoice", userChoice);

        console.log(isValidResponse, generatedDesignId);
        // update the design with the selected outfit
        if(!generatedDesignId){
          await this.handleError(
            "Tell the user that thier was an error updating the design. Please try again later.",
            "selectDesign",
          );
          this.socket.once("selectDesign", (data: SocketEventData) =>
            events.selectDesign(data?.response),
          );
          return;
        }
        const updateDesign = await DesignModel.update(
          { selectedOutfit: userChoice },
          { where: { id: generatedDesignId } },
        );
        if (!updateDesign[0]) {
          await this.handleError(
            "Tell the user that thier was an error updating the design. Please try again later.",
            "selectDesign",
          );
          this.socket.once("selectDesign", (data: SocketEventData) =>
            events.selectDesign(data?.response),
          );
          return;
        }

        const generationPrompt = `complement the users choice and ask them for thier budget in dollars`;
        const succPrompt = await this.agent.generateDynamicQuestion(
          generationPrompt,
          "ask the user for thier budget",
        );
        prompt = succPrompt;
        console.log("generatedDesignId[Number(userChoice)]",generatedDesignId[Number(userChoice)-1])
        this.socket.emit("ask", {
          content: succPrompt,
          data:{
            selectedImage: generatedImage[Number(userChoice)-1]
          },
          status: true,
          nextevent: "budget",
        });
      },
      budget: async (response: string) => {
        if (!response) {
          await this.handleError("Ask the user for thier budget in dollars", "budget");
          this.socket.once("budget", (data: SocketEventData) =>
            events.budget(data.response),
          );
          return;
        }
        console.log("budget", response);
        const isValidResponse = await this.agent.validateUserResponse(
          prompt,
          response,
        );
        if (!isValidResponse) {
          await this.handleError("Ask the user for thier budget in dollars", "budget");
          this.socket.once("budget", (data: SocketEventData) =>
            events.budget(data.response),
          );
          return;
        }
        const userChoice = await this.agent.extractAnswer(
          prompt,
          response,
          "string",
          {
            customPrompt:"get only the amount, if a currency is stated convert it to us dollars, if a currency is not stated. ignore the currency"
          }
        );

        console.log("userChoice budget", userChoice);
        budget = "$"+userChoice;
        // update the design with the users budget
        const updateDesign = await DesignModel.update(
          { budget: userChoice },
          { where: { id: generatedDesignId } },
        );
        if (!updateDesign[0]) {
          await this.handleError(
            "Tell the user that thier was an error updating the design. Please try again later.",
            "budget",
          );
          this.socket.once("budget", (data: SocketEventData) =>
            events.selectDesign(data?.response),
          );
          return;
        }
        const generationPrompt = `ask the user for thier timeline for the design completion`;
        const succPrompt = await this.agent.generateDynamicQuestion(
          generationPrompt,
          "design successfully generated",
        );
        prompt = succPrompt;
        this.socket.emit("ask", {
          content: succPrompt,
          status: true,
          nextevent: "timeline",
        });
      },
      timeline: async (response: string) => {
        if (!response) {
          await this.handleError("Ask the user for thier timeline", "timeline");
          this.socket.once("timeline", (data: SocketEventData) =>
            events.timeline(data.response),
          );
          return;
        }
        const isValidResponse = await this.agent.validateUserResponse(
          prompt+ `
          Calculate the exact date based on the user's input relative to today's date, which is ${new Date()}. Always use the format dd/mm/yy for the final output. Examples:
      - "5 weeks" should be calculated as 35 days added to ${new Date()} format it directly to dd/mm/yy.
      - If the user says "1 month," assume it as one calendar month from ${new Date()} format it directly to dd/mm/yy.
      - If a specific date like "15th January 2025" is mentioned, format it directly to dd/mm/yy.
      - "5 days" should be calculated as 5 days added to ${new Date()} format it directly to dd/mm/yy.
      - "yesterday" should return ${new Date()} format it directly to dd/mm/yy.
      - "tomorrow" should return 1day added to ${new Date()} format it directly to dd/mm/yy.
      Ensure the date is accurate and reflects the correct addition of days, weeks, or months relative to the current date.
      If the input is ambiguous, ask the user for clarification any date before ${new Date()} should return ${new Date()}.
      Note: all dates returned must be in this format dd/mm/yy only.
          `,
          response,
        );
        if (!isValidResponse) {
          await this.handleError("Ask the user for thier timeline", "timeline");
          this.socket.once("timeline", (data: SocketEventData) =>
            events.timeline(data.response),
          );
          return;
        }
        const userChoice = await this.agent.extractAnswer(
          prompt,
          response,
          "string",
         {
            customPrompt:`
            Calculate the exact date based on the user's input relative to today's date, which is ${new Date()}. Always use the format dd/mm/yy for the final output. Examples:
      - "5 weeks" should be calculated as 35 days added to ${new Date()} format it directly to dd/mm/yy.
      - If the user says "1 month," assume it as one calendar month from ${new Date()} format it directly to dd/mm/yy.
      - If a specific date like "15th January 2025" is mentioned, format it directly to dd/mm/yy.
      - "5 days" should be calculated as 5 days added to ${new Date()} format it directly to dd/mm/yy.
      - "yesterday" should return ${new Date()} format it directly to dd/mm/yy.
      - "tomorrow" should return 1day added to ${new Date()} format it directly to dd/mm/yy.
      Ensure the date is accurate and reflects the correct addition of days, weeks, or months relative to the current date.
      If the input is ambiguous, ask the user for clarification any date before ${new Date()} should return ${new Date()}.
      Note: all dates returned must be in this format dd/mm/yy only.
            `
         }
        );

        // update the design with the users timeline
        const updateDesign = await DesignModel.update(
          { timeline: userChoice },
          { where: { id: generatedDesignId } },
        );
        if (!updateDesign[0]) {
          await this.handleError(
            "Tell the user that thier was an error updating the design. Please try again later.",
            "budget",
          );
          this.socket.once("budget", (data: SocketEventData) =>
            events.selectDesign(data?.response),
          );
          return;
        }
        const desc = await this.agent.generateSentenceBasedOnContext(`Write a description for a fashion design job. The client is in ${userCity}, has a budget of ${budget}, and a timeline of ${userChoice}. Create the description as a single string without extra formatting or line breaks.`);

        //create a job 
        await JobService.createJob({
          designId:generatedDesignId,
          timeline:userChoice,
          description: desc

        },this.socket?.user?.id)
        const generationPrompt = `tell the user that the agent would find makers based in the users location ${userCity}, budget ${budget} and timeline ${userChoice} `;
        const succPrompt = await this.agent.generateSentenceBasedOnContext(
          generationPrompt,
          "design successfully generated",
        );
        prompt = succPrompt;
        this.socket.emit("success", {
          content: succPrompt,
          status: true,
          nextevent: "",
        });
      },
    };

    // Set up socket event listeners
    this.socket.setMaxListeners(15); // Prevent warning for max listeners
    this.socket.once("greeting", events.greeting);
    this.socket.once("DesignPrompt", (data: SocketEventData) =>
      events.design(data.response),
    );
    this.socket.once("PatternPrompt", (data: SocketEventData) =>
      events.pattern(data.response),
    );
    this.socket.once("materialUpload", (data: SocketEventData) =>
      events.material(data.response),
    );
    this.socket.once("materialDelivery", (data: SocketEventData) =>
      events.materialDelivery(data.response),
    );
    this.socket.once("selectDesign", (data: SocketEventData) =>
      events.selectDesign(data.response),
    );
    this.socket.once("budget", (data: SocketEventData) =>
      events.budget(data.response),
    );
    this.socket.once("timeline", (data: SocketEventData) =>
      events.timeline(data.response),
    );
  }

  /**
   * Placeholder for creating a job (to be implemented).
   */
  async createJob(): Promise<void> {
    // Implementation pending
  }
}
