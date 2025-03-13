# KnowledgeFeed

## Introduction

Welcome to KnowledgeFeed! This is a repository dedicated to curating knowledge on any topic related to your domain. Ever wanted to create your personalised feed of knowledge without wasting countless hours on various social media platforms and research sites? A constant pursuit of knowledge begins here that is intuitive and convinient. 

This package takes in a topic of your interest and creates a feed of posts with caption-sized facts derived from latest research papers and news articles. Along with that, it also returns relevant images, videos and relevant links to know more. You can choose to skim through, or dive deeper. And none of this without concrete citations. You can use this output to build your own knowledge bank. You only need to handle personalisation to the topics in the frontend. 

Happy learning!

## How to Contribute

We encourage everyone to contribute to KnowledgeFeed and help build a valuable resource for the community. Here's how you can contribute:

1. Fork the repository to your own GitHub account.
2. Create a new branch for your changes.
3. Make your desired changes, whether it's adding new content, fixing errors, or improving existing content.
4. Commit your changes and push them to your forked repository.
5. Open a pull request to the main repository, explaining the purpose and details of your changes.

Please make sure to follow our contribution guidelines and maintain a respectful and inclusive environment for all contributors.

## Installation and Usage (npm)

1.  **Install the package:**

    ```bash
    npm install knowledgefeed
    ```

2.  **API Keys:**

    Obtain a free API key from Groq and store it in your `.env` file as `GROQ_API_KEY`. You can also include your `OPENAI_API_KEY` in the same file if you plan to use OpenAI models.

3.  **Iterate and Consume:**

    The `buildFeed` function yields objects asynchronously. Use a `for await...of` loop to iterate and consume these objects:

    ```javascript
    const { FeedBuilder } = require('knowledgefeed');

    async function consumeFeed() {
      const feedBuilder = new FeedBuilder();
      const generator = feedBuilder.buildFeed(userInput, queryType, start);

      for await (const item of generator) {
        console.log(item); // Process each yielded object
      }
    }

    consumeFeed();
    ```

4.  **Data Structure:**

    Refer to the `test.json` sample file to understand the structure of the objects yielded by the `buildFeed` function. This will guide you on how to effectively utilize the data in your application.

5.  **Function Parameters:**

    The `buildFeed` function requires three parameters:

    * `userInput`: The search query string.
    * `queryType`: The type of query (e.g., "academic", "business").
    * `start`: The starting index for the search results. For instance, `0` retrieves the first set of results, `10` retrieves the next set, and so on. This allows you to paginate through search results.
    
## Where to Find Help

If you have any questions or need assistance, you can reach out to the maintainers of this repository or the community of contributors. Feel free to open an issue or join the discussion on the relevant topic.

## License

KnowledgeFeed is released under the [Apache License, Version 2.0]. By contributing to this repository, you agree to make your contributions available under the same license.

We appreciate your interest in contributing to KnowledgeFeed and hope you find it a valuable resource for your learning journey!

