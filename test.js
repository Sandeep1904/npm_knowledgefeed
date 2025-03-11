const axios = require('axios');
let query = "spectral graph theory"
query = query.split(" ").join("+")
let start = 0
const xml2js = require('xml2js');

const url = 'http://export.arxiv.org/api/query?search_query=all:electron&start=0&max_results=1';

async function fetchData() {
    try {
        const response = await axios.get(url);
        const xmlData = response.data;

        // Parse the XML data
        xml2js.parseString(xmlData, (err, result) => {
            if (err) {
                console.error("Error parsing XML:", err);
                return;
            }

            // Access specific tags
            const entries = result.feed.entry; // Access the entries in the feed
            entries.forEach(entry => {
                const title = entry.title[0]; // Get the title
                const authors = entry.author.map(author => author.name[0]); // Get the authors
                const summary = entry.summary[0]; // Get the summary

                console.log("Title:", title);
                console.log("Authors:", authors);
                console.log("Summary:", summary);

                // Extract <link> tags with title="pdf"
                const pdfLinks = entry.link.filter(link => link.$.title === 'pdf');
                pdfLinks.forEach(link => {
                    console.log("PDF Link:", link.$.href); // Get the href attribute
                });
            });
        });
    } catch (error) {
        console.error("Error fetching data:", error);
    }
}

fetchData();