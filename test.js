const axios = require('axios');

const url = 'http://export.arxiv.org/api/query?search_query=all:electron&start=0&max_results=4';

async function fetchData() {
    try {
        const response = await axios.get(url);
        console.log(response.data); // This will log the response data
    } catch (error) {
        console.error("Error fetching data:", error);
    }
}

fetchData();