const axios = require("axios");
const pdf_parse = require("pdf-parse");
const OpenAI = require("openai");
require('dotenv').config();
const groqClient = new OpenAI(
    { 
        apiKey: process.env.GROQ_API_KEY,
        baseURL: "https://api.groq.com/openai/v1"
    }
);

async function fetchdata() {
    let model = "llama-3.3-70b-versatile";
    let temp = 0.7;
    let results = "";
    let prompt = "HI"
    try {
        results = await groqClient.chat.completions.create(
            {
                model:model,
            temperature:temp,

            messages:[
                {
                    "role": "user",
                    "content": prompt
                }
            ],

            }
        );
        results = String(results.choices[0].message.content);
    } catch (error) {
        console.log(`Groq Output Error ${error}`);
    }
    console.log(results);
}

fetchdata();