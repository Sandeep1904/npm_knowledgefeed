require('dotenv').config();
const OpenAI = require("openai");

const client = new OpenAI( {
    apiKey: process.env.OPENAI_API_KEY
    }
)

const groqClient = new OpenAI(
    { 
        apiKey: process.env.GROQ_API_KEY,
        baseURL: "https://api.groq.com/openai/v1"
    }
);


async function main() {
    const chatCompletion = await getGroqChatCompletion();
    // Print the completion returned by the LLM.
    console.log(chatCompletion.choices[0]?.message?.content || "");
}

async function getGroqChatCompletion() {
    return groqClient.chat.completions.create({
        messages: [
            {
                role: "user",
                content: "keep it very short. Explain the importance of fast language models",
            },
        ],
        model: "llama-3.3-70b-versatile",
    });
}

// Call the main function to execute
main();