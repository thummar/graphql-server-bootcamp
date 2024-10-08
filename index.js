import { ApolloServer } from '@apollo/server'

import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import express from 'express';
import { createServer } from 'http';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { PubSub } from 'graphql-subscriptions';
import bodyParser from 'body-parser';
import cors from 'cors';

const PORT = 4000;
const pubsub = new PubSub();

// data
import db from './_db.js'

// types
import { typeDefs } from './schema.js'

// resolvers
const resolvers = {
  Query: {
    books() {
      return db.books
    },
    book(_, args) {
      return db.books.find((book) => book.id === args.id)
    },
    authors() {
      return db.authors
    },
    author(_, args) {
      return db.authors.find((author) => author.id === args.id)
    },
    bookReviews(_, args) {
      return db.bookReviews.filter((r) => r.book_id === args.id)
    },
    authorReviews(_, args) {
      return db.authorReviews.filter((r) => r.author_id === args.id)
    }
  },
  Book: {
    authors(parent) {
      return db.authors.filter((a) => a.book_ids.includes(parent.id))
    },
    reviews(parent) {
      return db.bookReviews.filter((r) => r.book_id === parent.id)
    }
  },
  BookReview: {
    book(parent) {
      return db.books.find((b) => b.id === parent.book_id)
    }
  },
  Author: {
    books(parent) {
      return db.books.filter((b) => b.author_ids.includes(parent.id))
    },
    reviews(parent) {
      return db.authorReviews.filter((r) => r.author_id === parent.id)
    }
  },
  AutherReview: {
    author(parent) {
      return db.authors.find((a) => a.id === parent.author_id)
    }
  },
  Mutation: {
    addBookReview(_, args) {
      let review = {
        ...args.review, 
        book_id: args.bookID,
        id: Math.floor(Math.random() * 10000).toString()
      }
    
      // Subscription
      bookReviewAdded(review)

      db.bookReviews.push(review)
      return review
    },
    updateBookReview(_, args) {
      db.bookReviews = db.bookReviews.map((g) => {
        if (g.id === args.id) {
          return {...g, ...args.edits}
        }
        return g
      })

      let review = db.bookReviews.find((g) => g.id === args.id)

      // Subscription
      bookReviewUpdated(review)

      return review
    },
    deleteBookReview(_, args) {

      // Subscription
      let review = db.bookReviews.find((b) => b.id === args.id);
      bookReviewDeleted(review)

      db.bookReviews = db.bookReviews.filter((g) => g.id !== args.id)
      return  review
    },


    addAuthorReview(_, args) {
      let review = {
        ...args.review, 
        author_id: args.authorID,
        id: Math.floor(Math.random() * 10000).toString()
      }
    
      // Subscription
      authorReviewAdded(review)

      db.authorReviews.push(review)
      return review
    },
    updateAuthorReview(_, args) {
      db.authorReviews = db.authorReviews.map((g) => {
        if (g.id === args.id) {
          return {...g, ...args.edits}
        }
        return g
      })

      let review = db.authorReviews.find((g) => g.id === args.id)

      // Subscription
      authorReviewUpdated(review)

      return review
    },
    deleteAuthorReview(_, args) {

      // Subscription
      let review = db.authorReviews.find((b) => b.id === args.id);
      authorReviewDeleted(review)

      db.authorReviews = db.authorReviews.filter((g) => g.id !== args.id)
      return  review
    }
  },
  Subscription: {
    bookReviewAdded: {
      // Additional event labels can be passed to asyncIterator creation
      subscribe: () => pubsub.asyncIterator(['BOOK_REVIEW_ADDED']),
    },
    bookReviewUpdated: {
      // Additional event labels can be passed to asyncIterator creation
      subscribe: () => pubsub.asyncIterator(['BOOK_REVIEW_UPDATED']),
    },
    bookReviewDeleted: {
      // Additional event labels can be passed to asyncIterator creation
      subscribe: () => pubsub.asyncIterator(['BOOK_REVIEW_DELETED']),
    },

    authorReviewAdded: {
      // Additional event labels can be passed to asyncIterator creation
      subscribe: () => pubsub.asyncIterator(['AUTHOR_REVIEW_ADDED']),
    },
    authorReviewUpdated: {
      // Additional event labels can be passed to asyncIterator creation
      subscribe: () => pubsub.asyncIterator(['AUTHOR_REVIEW_UPDATED']),
    },
    authorReviewDeleted: {
      // Additional event labels can be passed to asyncIterator creation
      subscribe: () => pubsub.asyncIterator(['AUTHOR_REVIEW_DELETED']),
    } 
  }
}

// Create schema, which will be used separately by ApolloServer and
// the WebSocket server.
const schema = makeExecutableSchema({ typeDefs, resolvers });


// Create an Express app and HTTP server; we will attach the WebSocket
// server and the ApolloServer to this HTTP server.
const app = express();
const httpServer = createServer(app);
// Set up WebSocket server.
const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
});
const serverCleanup = useServer({ schema }, wsServer);

// Set up ApolloServer.
const server = new ApolloServer({
  schema,
  plugins: [
      // Proper shutdown for the HTTP server.
      ApolloServerPluginDrainHttpServer({ httpServer }),
      // Proper shutdown for the WebSocket server.
      {
          async serverWillStart() {
              return {
                  async drainServer() {
                      await serverCleanup.dispose();
                  },
              };
          },
      },
  ],
});
await server.start();
app.use('/graphql', cors(), bodyParser.json(), expressMiddleware(server));
// Now that our HTTP server is fully set up, actually listen.
httpServer.listen(PORT, () => {
  console.log(`🚀 Query endpoint ready at http://localhost:${PORT}/graphql`);
  console.log(`🚀 Subscription endpoint ready at ws://localhost:${PORT}/graphql`);
});



function bookReviewAdded(review) {
  pubsub.publish('BOOK_REVIEW_ADDED', { bookReviewAdded: review });
}
function bookReviewUpdated(review) {
  pubsub.publish('BOOK_REVIEW_UPDATED', { bookReviewUpdated: review });
}
function bookReviewDeleted(review) {
  if (review) {
    pubsub.publish('BOOK_REVIEW_DELETED', { bookReviewDeleted: review });
  }  
}


function authorReviewAdded(review) {
  pubsub.publish('AUTHOR_REVIEW_ADDED', { authorReviewAdded: review });
}
function authorReviewUpdated(review) {
  pubsub.publish('AUTHOR_REVIEW_UPDATED', { authorReviewUpdated: review });
}
function authorReviewDeleted(review) {
  if (review) {
    pubsub.publish('AUTHOR_REVIEW_DELETED', { authorReviewDeleted: review });
  }  
}
