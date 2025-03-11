require('dotenv').config();
const fs = require('fs');
const OpenAI = require("openai");
const axios = require("axios");
const pdf_parse = require("pdf-parse");
const { convert } = require("html-to-text");
const DDG = require('duck-duck-scrape');
const xml2js = require('xml2js');


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

    async search(query, start=0, query_type) {
        if (query_type == "academic") {
            query = query.split(" ").join("+");
            const url = `http://export.arxiv.org/api/query?search_query=${query}&start=${start}&max_results=4`;
            try {
                const response = await axios.get(url);
                console.log("Academic search successfull!"); 
            } catch (error) {
                console.error("Error fetching data:", error);
            }
            return response.data

        } else {
            const searchResults = await DDG.searchNews(query, {
                safeSearch: DDG.SafeSearchType.STRICT
              });
              return searchResults.results;
        }
        
    }

    async convertInput(input, type) {
        let data = "";
        try {
            const response = await axios.get(input, { ResponseType: 'arraybuffer' });
            const input_data = response.data;

            if (type == "pdf") {
                data = await pdf_parse(input_data);
                data = data.text;
                
            }
            else {
                const response = await axios.get(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    }
                });
                const htmlData = response.data;

                // Convert HTML to plain text
                data = convert(htmlData, {
                    // wordwrap
                });
            }
            
            return data;

        } catch (error) {
            console.log("Error converting input!: ", error);
            return data;
        }
    }

    async categoriser(query, query_type="business", start=0) {
        const query_type = query_type.toLowerCase();
        let allContent = [];
        let md_str = "";
        const query = query.toLowerCase();
        const images = DDG.searchImages(query);
        let sources = [];
        let resources = [
            {
                "images": images
            }
        ];
        // if academic -> do arxiv and get list of urls. for each url get make md_str and append to allContent
        // if business -> get urls from ddg. for each url make md_str and append to allContent

        if (query_type == "academic") {
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
            for (let source in sources) {
                md_str = this.convertInput(source, "pdf");
                allContent.push({'pdflink': source, 'md_str': md_str, 'resources': resources})
            }
        }
        else {
            
            const searchResults = this.search(query);
            for (let object of searchResults) {
                let source = object.url;
                sources.push(source);
            }
            for (let source in sources) {
                md_str = this.convertInput(source, "html");
                allContent.push({'abslink': source, 'md_str': md_str, 'resources': resources});
            }
            
        }
        console.log("Returning all content!")
        return allContent;
    }

}

class ObjectBuilder {
    constructor() {

    }

    build_object(abslink, pdflink, md_str, model, source, temp, personality, resources) {

    }
}


class FeedBuilder {
    constructor(){

    }

    build_feed(user_input, query_type, start){
        const allContent = new Fetcher().categoriser(user_input, query_type, start)
        let feed = []
        for (const content of allContent) {
            const abslink = content.abslink || null;
            const pdflink = content.pdflink || null;
            const md_str = content.md_str || null;
            const resources = content.resources || null;
            const model = "llama-3.3-70b";
            const source = "ddgs";
            const temperature = 0.7;
            const personality = "friendly";
            const ob = new ObjectBuilder();
            let objectResponse = ob.build_object(abslink, pdflink, md_str, model, source, temp, personality, resources);
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



async function main() {
    
}



// Call the main function to execute
main();