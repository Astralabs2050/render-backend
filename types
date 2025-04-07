  export interface ResponsePayload {
            model: string;
            store: boolean;
            input: { role: string; content: string; }[];
            tools: {
                type: string;
                name: string;
                description: string;
                strict: boolean;
                parameters: {
                    type: string;
                    properties: {
                        name: { type: string; description: string; };
                        city: { type: string; description: string; };
                        country: { type: string; description: string; };
                        age: { type: string; description: string; };
                        interest: { type: string; description: string; };
                        description: { type: string; description: string; };
                    };
                    required: string[];
                    additionalProperties: boolean;
                };
            }[];
           
            previous_response_id?: string;
        }

        export interface ToolParameterProperty {
            type: string;
            description?: string;
            enum?: string[];
            pattern?: string;
            properties?: Record<string, ToolParameterProperty>;
            required?: string[];
            additionalProperties?: boolean;
            items?: ToolParameterProperty;
          }
          
          export interface ToolParameters {
            type: string;
            properties: Record<string, ToolParameterProperty>;
            required?: string[];
            additionalProperties?: boolean;
          }
          
          export interface Tool {
            type: "function";
            name: string;
            description: string;
            strict?: boolean;
            parameters: ToolParameters;
            
          }
          
          export interface AgentConfig {
            name: string;
            publicDescription: string; // gives context to agent transfer tool
            instructions: string;
            tools: Tool[];
            toolLogic?: Record<
              string,
              (args: any, transcriptLogsFiltered: TranscriptItem[]) => Promise<any> | any
            >;
            downstreamAgents?: AgentConfig[] | { name: string; publicDescription: string }[];
          }
          
          export type AllAgentConfigsType = Record<string, AgentConfig[]>;
          
          export interface TranscriptItem {
            itemId: string;
            type: "MESSAGE" | "BREADCRUMB";
            role?: "user" | "assistant";
            title?: string;
            data?: Record<string, any>;
            expanded: boolean;
            timestamp: string;
            createdAtMs: number;
            status: "IN_PROGRESS" | "DONE";
            isHidden: boolean;
          }
          
          export interface Log {
            id: number;
            timestamp: string;
            direction: string;
            eventName: string;
            data: any;
            expanded: boolean;
            type: string;
          }
          
          export interface ServerEvent {
            type: string;
            event_id?: string;
            item_id?: string;
            transcript?: string;
            delta?: string;
            session?: {
              id?: string;
            };
            item?: {
              id?: string;
              object?: string;
              type?: string;
              status?: string;
              name?: string;
              arguments?: string;
              role?: "user" | "assistant";
              content?: {
                type?: string;
                transcript?: string | null;
                text?: string;
              }[];
            };
            response?: {
              output?: {
                type?: string;
                name?: string;
                arguments?: any;
                call_id?: string;
              }[];
              status_details?: {
                error?: any;
              };
            };
          }