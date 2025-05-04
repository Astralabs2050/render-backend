import { design_onboarding_astra } from "../agent/collection.config";
import client from "../socket/llm";

class collectionAgent {
    public async collectionAgent(data:any){
        try{
            let input:any
            if(data?.type === "input_image"){
              if (!data?.image) throw new Error("Missing image for input_image type");
              input =[
                {
                  "role":"assistant",
                  "content":design_onboarding_astra.instructions
                },
                {
                role: "user",
                content: [
                    { type: "input_text", text: "explain the design or and material of this image" },
                    {
                        type: "input_image",
                        image_url: `data:image/jpeg;base64,${data?.image}`,
                    },
                ],
            }]
            }else{
              input = [
                {
                  "role":"assistant",
                  "content":design_onboarding_astra.instructions
                },
                {"role": "user", "content": data.message}
              ]
            }
            console.log("this is the input 11",input)
            const userInput:any = {
              model: "gpt-4.1",
              input,
              store: true,
          }
            
            if (data?.previousId) {
              userInput.previous_response_id = data?.previousId;
            }
            const Response = await client.responses.create(userInput);
            return Response
        }catch(err:any){
            throw new Error(err?.message)
        }
    }
}

const collectionAgentClass = new collectionAgent()
export default collectionAgentClass