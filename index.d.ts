declare module 'knowledgefeed' {
    interface FeedItem {
        [key: string]: any;
      }

      export class FeedBuilder {
        buildFeed(userInput: string, queryType: string, start: number): AsyncGenerator<FeedItem>;
      }
    
}

