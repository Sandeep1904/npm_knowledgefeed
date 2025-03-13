require('dotenv').config();
const fs = require('fs');
const OpenAI = require("openai");
const axios = require("axios");
const pdf_parse = require("pdf-parse");
const { convert } = require("html-to-text");
const DDG = require('duck-duck-scrape');
const xml2js = require('xml2js');
const { send } = require('process');
const { queryString } = require('duck-duck-scrape/lib/util');


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

// expected workflow
// FeedBuilder
// Fetcher
// ObjectBuilder
// Feed
// Agent
// Posts
// Post
// LLM Handlers
// FeedModifier

class Fetcher {
    constructor() {

    }

    async search(query, query_type, start = 0) {
        if (query_type == "academic") {
            query = query.split(" ").join("+");
            const url = `http://export.arxiv.org/api/query?search_query=${query}&start=${start}&max_results=2`;
            try {
                const response = await axios.get(url);
                console.log("Academic search successfull!"); 
                return response.data;
            } catch (error) {
                console.error("Error fetching data:", error);
                return ""
            }
            

        } else {
            const searchResults = await DDG.searchNews(query, {
                safeSearch: DDG.SafeSearchType.STRICT
              });
              return searchResults.results;
        }
        
    }

    async convertInput(input, type) {
        console.log(`Converting input: ${input}, type: ${type}`);
        let data = ""; // Initialize data outside of the try block
    
        try {
            if (type === "pdf") {
                const response = await axios.get(input, { responseType: 'arraybuffer' }); // Corrected responseType
                const inputData = response.data;
                const pdfData = await pdf_parse(inputData);
                data = pdfData.text;
            } else if (type === "html") {
                const response = await axios.get(input, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    }
                });
                const htmlData = response.data;
                data = convert(htmlData); // Convert HTML to text
            } else {
                console.warn(`Unsupported input type: ${type}`);
                return ""; // Return empty string for unsupported types
            }
    
            console.log("Conversion successful.");
            return data;
    
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error(`Axios Error: ${error.message}, Status: ${error.response?.status}`);
            } else if (error instanceof Error) {
                console.error(`Conversion Error: ${error.message}`);
            } else {
                console.error(`Unknown Conversion Error: ${error}`);
            }
            return ""; // Return empty string on error to prevent issues
        }
    }

    async categoriser(query, query_type="business", start) {
        query_type.toLowerCase();
        let allContent = [];
        let md_str = "";
        query.toLowerCase();
        let images = [];
        try{
            console.log("Trying image search!")
            images = await DDG.searchImages(query);
        } catch (error) {
            console.log(`DDGS Search Error ${error}`);
        }
        
        let sources = [];
        let resources = [
            {
                "images": images.results
            }
        ];
        // if academic -> do arxiv and get list of urls. for each url get make md_str and append to allContent
        // if business -> get urls from ddg. for each url make md_str and append to allContent

        if (query_type == "academic") {
            const xmlData = await this.search(query, query_type, start)
            // Parse the XML data
            xml2js.parseString(xmlData, (err, result) => {
                if (err) {
                    console.error("Error parsing XML:", err);
                    return;
                }

                // Access specific tags
                const entries = result.feed.entry; // Access the entries in the feed
                entries.forEach(entry => {
                
                    // Extract <link> tags with title="pdf"
                    const pdfLinks = entry.link.filter(link => link.$.title === 'pdf');
                    pdfLinks.forEach(link => {
                        sources.push(link.$.href); // Get the href attribute
                    });
                });
            });
            for (let source of sources) {
                md_str = await this.convertInput(source, "pdf");
                allContent.push({'pdflink': source, 'md_str': md_str, 'resources': resources})
            }
        }
        else {
            
            const searchResults = await this.search(query, query_type, start);
            for (let object of searchResults) {
                let source = object.url;
                sources.push(source);
            }
            for (let source of sources) {
                md_str = await this.convertInput(source, "html");
                allContent.push({'abslink': source, 'md_str': md_str, 'resources': resources});
            }
            
        }
        console.log(`Returning all content! ${allContent}`)
        
        return allContent;
    }

}



class Feed {
    static id = -1;

    constructor(abslink, pdflink, md_str) {
        this.abslink = abslink
        this.pdflink = pdflink
        this.md_str = md_str
        Feed.id += 1
        this.id = Feed.id
        this.items = {
            'objectID': this.id,
            'abslink': this.abslink,
            'pdflink': this.pdflink,
            'md_str': this.md_str,
        }
    }

    addAgent(agent) {
        this.items.agent = agent;
        console.log("Agent Added Successfully!");
    }

    addPosts(posts) {
        this.items.posts = posts;
        console.log("Posts Added Successfully!");
    }

    getFeed() {
        return this.items
    }

}

class Agent {
    constructor(model, source, temp, personality) {
        this.model = model;
        this.source = source;
        this.temp = temp;
        this.personality = personality;

        this.agent = [
            {
                'model': this.model,
                'source': this.source,
                'temp': this.temp,
                'personality': this.personality,
            }
        ];
    }

    getAgent() {
        return this.agent;
    }
}

class Post {
    static id = -1;
    static oldObjectID = 0;

    constructor(text, chatContext, resources, objectID) {
        this.text = text;
        this.chatContext = chatContext;
        this.resources = resources;
        this.newObjectID = objectID;

        if (Post.oldObjectID !== this.newObjectID) {
            Post.oldObjectID = this.newObjectID;
            Post.id = -1;
        }
        Post.id += 1;
        this.id = Post.id;

        this.post = {
            postID: this.id,
            text: this.text,
            chatContext: this.chatContext,
            resources: this.resources,
        };
    }

    getPost() {
        return this.post;
    }
}

class Posts {
    constructor() {
        this.posts = [];
    }

    addPost(post) {
        this.posts.push(post);
        console.log("Post added successfull!");
    }

    getPosts() {
        return this.posts;
    }
}

class LLMHandler {
    constructor() {

    }

    async callLLM(prompt, model, source, personality, temp) {
        let results = "";
        source.toLowerCase();
        if (source == "groq") {
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
                this.model = "gpt-4o-min";
                this.source = "openai";
            }
            
        }

        if (source == "openai") {
            try {
                results = await client.chat.completions.create(
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
                console.log("Openai response success.")
            } catch (error) {
                console.log(`OpenAI Output Error ${error}`);

            }
        }
        console.log("Returning LLM Output");
        return results;
    }
}




class ObjectBuilder {
    constructor() {
        this.model= 'llama-3.3-70b-versatile';
        this.source = 'groq';
        this.personality = "assistant";
        this.temperature = 0.7;
    }

    breakMarkdown(md_str, maxLength) {
        // Initialize an empty array to hold the chunks
        const chunks = [];
        // Start from the beginning of the string
        let start = 0;
        const percentage = 0.3;
    
        // Loop until the end of the string
        while (start < md_str.length) {
            // Get the end index for the current chunk
            let end = start + maxLength;
    
            // If the end index exceeds the string length, adjust it
            if (end > md_str.length) {
                end = md_str.length;
            }
    
            // Append the chunk to the array
            chunks.push(md_str.slice(start, end));
    
            // Move the start index to the end of the current chunk
            start = end;
        }
    
        const remove = Math.floor(chunks.length * percentage);
        if (chunks.length - remove > 2) {
            const startIndex = remove;
            const endIndex = chunks.length - remove;
            return chunks.slice(startIndex, endIndex);
        }
        return chunks;
    }

    async buildPosts(md_str, resources, objectID) {
        const chunks = this.breakMarkdown(md_str, 4000);
        const LLM = new LLMHandler();
        const posts = new Posts();
        let results = "";

        for (let chunk of chunks) {
            const prompt = `You are a deligent research assistant and you have 3 tasks.
            1. Clean the markdown string given below about a academic or business
            topic by removing all unnecessary sections that don't cotribute any 
            insights about the main topic. Must not produce output yet.
            2. Then analyze the cleaned content and create as many caption-sized highlights
            as possible. Must not produce output yet.
            3. Finally, your response should only and only contain a list of strings,
            that are the highlights you created in the previous step.
            ${chunk}`

            const chunkResults = await LLM.callLLM(prompt, this.model, this.source, 
                this.personality, this.temperature)
            results = results + chunkResults + "\n";

        }
        md_str = results;
        
        try {
            let sentences = results.split("\n");
            sentences.forEach(sentence => {
                const post = new Post(sentence, md_str, resources, objectID);
                posts.addPost(post.getPost());
            })
        } catch (error) {
            console.log(`Error Building Posts ${error}`)
        }

        console.log("Returning Posts")
        return posts
    }

    async buildObject(abslink, pdflink, md_str, model, source, temp, personality, resources) {
        const feedObject = new Feed(abslink, pdflink, md_str);
        
        // Create a new Agent object
        const agent = new Agent(model, source, temp, personality);
        
        // Add the agent to the feed object
        feedObject.addAgent(agent.getAgent());
        
        // Build posts and add them to the feed object
        const posts = await this.buildPosts(md_str, resources, feedObject.id);
        feedObject.addPosts(posts.getPosts());
        
        console.log('Object built successfully!');
        return feedObject.getFeed();
    }
}


class FeedBuilder {
    constructor(){

    }

    async *buildFeed(user_input, query_type, start){
        const fetcher = new Fetcher()
        const allContent = await fetcher.categoriser(user_input, query_type, start)
        console.log(typeof(allContent))
        let feed = [];
        for (const content of allContent) {
            const abslink = content.abslink || null;
            const pdflink = content.pdflink || null;
            const md_str = content.md_str || null;
            const resources = content.resources || null;
            const model = "llama-3.3-70b-versatile";
            const source = "groq";
            const temp = 0.7;
            const personality = "assistant";
            const ob = new ObjectBuilder();
            let objectResponse = await ob.buildObject(abslink, pdflink, md_str, model, source, temp, personality, resources);
            feed.push(objectResponse)
            console.log("Sent OBJECT to frontend!")

            yield objectResponse
        }
        
        const fileName = 'output.json';

        fs.writeFile(fileName, JSON.stringify(feed, null, 4), (err) => {
            if (err) {
                console.error('Error writing to file', err);
            } else {
                console.log("Feed stored in JSON file");
            }
        });
    }
}

class FeedModifier {
    // return a copy of original feed. user can choose to replace.

    constructor() {

    }

    modify_agent(feed, objectID, model, source, temp, personality) {
        console.log("Old agent: \n");
        console.log(JSON.stringify(feed[objectID]?.agent)); // Using JSON.stringify for better output

        // Create a deep copy of the feed
        const copyfeed = JSON.parse(JSON.stringify(feed));

        // Update the agent properties
        if (copyfeed[objectID] && copyfeed[objectID].agent) {
            copyfeed[objectID].agent = {
                ...copyfeed[objectID].agent, // Spread existing properties to preserve them
                model: model,
                source: source,
                temp: temp,
                personality: personality,
            };
        } else {
            console.warn(`Warning: objectID ${objectID} or agent not found in feed.`);
            return feed; // Or handle this case differently, e.g., throw an error
        }

        console.log(`\nAfter modifying agent for objectID: ${objectID}\n`);
        console.log(JSON.stringify(copyfeed[objectID]?.agent)); // Using JSON.stringify

        return copyfeed;
    }

    modify_chatContext(feed, objectID, postID, newchatContext) {
        console.log("\nOld chatContext: \n");
        console.log(JSON.stringify(feed[objectID]?.posts?.[postID]?.chatContext)); // Using JSON.stringify and optional chaining

        // Create a deep copy of the feed
        const copyfeed = JSON.parse(JSON.stringify(feed));

        // Update the chatContext
        if (copyfeed[objectID] && copyfeed[objectID].posts && copyfeed[objectID].posts[postID]) {
            copyfeed[objectID].posts[postID] = {
                ...copyfeed[objectID].posts[postID], // Spread existing properties
                chatContext: newchatContext,
            };
        } else {
            console.warn(`Warning: objectID ${objectID}, postID ${postID}, or posts/chatContext not found in feed.`);
            return feed; // Or handle this case differently
        }

        console.log(`\nAfter modifying chatContext for objectID: ${objectID}, postID: ${postID}\n`);
        console.log(JSON.stringify(copyfeed[objectID]?.posts?.[postID]?.chatContext)); // Using JSON.stringify and optional chaining

        return copyfeed;
    }
}

module.exports = { FeedBuilder, FeedModifier }