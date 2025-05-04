import OpenAI from "openai";

const client = new OpenAI({
    apiKey: process.env.OPEN_API_KEY
});

export default client