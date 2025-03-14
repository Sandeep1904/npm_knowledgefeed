const { FeedBuilder } = require('./index');

async function consumeFeed() {
    const query = "Cryptography vector space";
    const query_type = "academic";
    const start = 0;
    const feedBuilder = new FeedBuilder();
    const generator = feedBuilder.buildFeed(query, query_type, start);

    for await (const object of generator) {
        console.log(object); // Process each yielded object
    }
}

consumeFeed();