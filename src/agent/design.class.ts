import { UsersModel } from "../model";
import { Socket } from "socket.io";
import DesignService from "../service/design.service";

export interface AgentType {
    generateDynamicQuestion(prompt: string, context?: string): Promise<string>;
    validateUserResponse(prompt: string, response: string): Promise<boolean>;
    extractAnswer(prompt: string, response: string, type: string): Promise<string>;
    checkPositiveResponse(prompt: string, response: string, type: string): Promise<string>;
    generateSentenceBasedOnContext(prompt: string, context?: string): Promise<string>;
    selectChoiceBasedOnIntent(prompt: string, choices: string[],response: string): Promise<string>;
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
            const errorMessage = await this.agent.generateDynamicQuestion(prompt, "error message");
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
        const user: User | null = await UsersModel.findOne({ where: { id: this.socket?.user?.id } });
        const userCity = user?.dataValues?.city;

        const events = {
            /**
             * Sends a greeting message personalized with the user's city (if available).
             */
            greeting: async (): Promise<void> => {
                const greetingPrompt = `Welcome to Astra!${userCity ? ` It looks like you're joining us from ${userCity}.` : ""} We’re excited to help bring your fashion design ideas to life! Could you share the project you have in mind?`;
                const greeting = await this.agent.generateDynamicQuestion(greetingPrompt, "welcome users");
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
                    await this.handleError("Could you please provide some design ideas?", "DesignPrompt");
                    this.socket.once("DesignPrompt", (data: SocketEventData) => events.design(data.response));
                    return;
                }
                console.log("prompt, designPrompt",prompt, designPrompt)
                const isValid = await this.agent.validateUserResponse(prompt, designPrompt);
                if (!isValid) {
                    await this.handleError("Could you please provide some design ideas?", "DesignPrompt");
                    this.socket.once("DesignPrompt", (data: SocketEventData) => events.design(data.response));
                    return;
                }

                userPrompt = designPrompt

                const patternPrompt = `Ask the user if there have a  material for there design dont offer any recommendation and dont ask any other question. the users design ${userPrompt}`;
                const materialPrompt = await this.agent.generateDynamicQuestion(patternPrompt);
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
                    await this.handleError(`Ask the user if there have a  material for there design dont offer any recommendation and dont ask any other question. the users design ${userPrompt}`, "PatternPrompt");
                    this.socket.once("PatternPrompt", (data: SocketEventData) => events.pattern(data.response));
                    return;
                }

                const patternResponse = await this.agent.checkPositiveResponse(prompt, patternPrompt, "string");
                console.log("Pattern Response:", patternResponse);
                // the next event will collect the pattern via base64 or url
                if(patternResponse){
                    const materialDeliveryPrompt = "Ask the user if there Will be able to deliver the fabric to the maker, or do there prefer the maker to pick it up from there location";
                    const DeliveryPrompt = await this.agent.generateDynamicQuestion(materialDeliveryPrompt);
                    prompt = DeliveryPrompt;
                    this.socket.emit("ask", {
                        content: DeliveryPrompt,
                        status: true,
                        nextevent: "materialDelivery",
                    });
                }else{
                    // tell the user that there design is been created
                    const generationPrompt = "tell the user that there design is been generated";
                    const genPrompt = await this.agent.generateSentenceBasedOnContext(generationPrompt,"design is been generated");
                    this.socket.emit("ask", {
                        content: genPrompt,
                        status: true,
                        nextevent: "",
                    })
                  
                    try{
                        const newDesign = await DesignService.generateNewDesign({
                            prompt:userPrompt,
                        },this.socket?.user?.id)
                        if(!newDesign?.status){
                            const errorPrompt = `tell the user that there was an error creating design this is the error ${newDesign?.message}. tell user to try again`;
                            await this.handleError(errorPrompt,"DesignPrompt");
                           this.socket.once("DesignPrompt", (data: SocketEventData) => events.pattern(data.response));
                        }
                        const generationPrompt = "tell the user that there design has been generated and there should select the outfit there prefer";
                    const succPrompt = await this.agent.generateSentenceBasedOnContext(generationPrompt,"design successfully generated");
                    prompt = succPrompt;
                        this.socket.emit("sucess", {
                            content:succPrompt,
                            data:newDesign,
                            status: true,
                            nextevent: "selectDesign",
                        })
                    }catch(err:any){
                        console.log("Error while creating design",err)
                        const errorPrompt = `tell the user that there was an error creating design this is the error ${err?.message}. tell user to try again`;
                         await this.handleError(errorPrompt,"DesignPrompt");
                        this.socket.once("DesignPrompt", (data: SocketEventData) => events.pattern(data.response));
                        return;
                    }
                   
                   
                }
                // Additional steps can be added here as needed.
            },
            materialDelivery: async(response:string)=>{
                if(!response){
                    await this.handleError("Ask the user if there Will be able to deliver the fabric to the maker, or do there prefer the maker to pick it up from there location","materialDelivery");
                    this.socket.once("materialDelivery", (data: SocketEventData) => events.materialDelivery(data.response));
                    return;
                }
                const getUserChoice = await this.agent.selectChoiceBasedOnIntent(prompt,["deliver","pickup"],response);
                console.log("User Choice:", getUserChoice);
                if(getUserChoice === "deliver"){
                    materialDelivery = true;
                }
                const patternPrompt = "Ask the user to upload an image of the specific pattern or material in mind for there design?";
                const materialPrompt = await this.agent.generateDynamicQuestion(patternPrompt);
                prompt = materialPrompt;
                this.socket.emit("ask", {
                    content: materialPrompt,
                    status: true,
                    nextevent: "materialUpload",
                });
            },
            material: async(pattern: string)=>{
                if (!pattern) {
                    await this.handleError("Ask the user to upload an image of the specific pattern or material in mind for there design?", "materialUpload");
                    this.socket.once("materialUpload", (data: SocketEventData) => events.pattern(data.response));
                    return;
                }
               
                // tell the user that there design is been created
                const generationPrompt = "send a message to the user that there design is been created";
                const genPrompt = await this.agent.generateSentenceBasedOnContext(generationPrompt);
                this.socket.emit("ask", {
                    content: genPrompt,
                    status: true,
                    nextevent: "",
                })
                try{
                    const newDesign = await DesignService.generateNewDesign({
                        prompt:userPrompt,
                        image:pattern
                    },this.socket?.user?.id)
                    if(!newDesign?.status){
                        const errorPrompt = `tell the user that there was an error creating design this is the error ${newDesign?.message}. tell user to try again`;
                        await this.handleError(errorPrompt,"DesignPrompt");
                       this.socket.once("DesignPrompt", (data: SocketEventData) => events.pattern(data.response));
                    }
                    const generationPrompt = "tell the user that there design has been generated and there should select the outfit there prefer";
                const succPrompt = await this.agent.generateDynamicQuestion(generationPrompt,"design successfully generated");
                prompt = succPrompt;
                    this.socket.emit("sucess", {
                        content:succPrompt,
                        data:newDesign,
                        status: true,
                        nextevent: "selectDesign",
                    })
                }catch(err:any){
                    console.log("Error while creating design",err)
                    const errorPrompt = `tell the user that there was an error creating design this is the error ${err?.message}. tell user to try again`;
                     await this.handleError(errorPrompt,"DesignPrompt");
                    this.socket.once("DesignPrompt", (data: SocketEventData) => events.pattern(data.response));
                    return;
                }
    
            },
            selectDesign: async(response:string)=>{

            }
        };

        // Set up socket event listeners
        this.socket.setMaxListeners(15); // Prevent warning for max listeners
        this.socket.once("greeting", events.greeting);
        this.socket.once("DesignPrompt", (data: SocketEventData) => events.design(data.response));
        this.socket.once("PatternPrompt", (data: SocketEventData) => events.pattern(data.response));
        this.socket.once("materialUpload", (data: SocketEventData) => events.material(data.response));
        this.socket.once("materialDelivery", (data: SocketEventData) => events.materialDelivery(data.response));
        this.socket.once("selectDesign", (data: SocketEventData) => events.selectDesign(data.response));
        
    }

    /**
     * Placeholder for creating a job (to be implemented).
     */
    async createJob(): Promise<void> {
        // Implementation pending
    }
}
