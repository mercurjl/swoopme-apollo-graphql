import * as admin from 'firebase-admin';

const serviceAccount = require('../service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

import { ApolloServer, ApolloError, ValidationError, gql } from 'apollo-server';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface Event {
  id: string;
  title: number;
  description: string;
  user: User;
  location: Location;
  rsvp: string;
  public: boolean
}

interface Location {
  latitiude: number,
  longitude: number
}

const typeDefs = gql`
  # A User
  type User {
    id: ID!
    firstName: String!
    lastName: String!
    email: Int!
    events: [Event]!
  }

  # An Event Object
  type Event {
    id: ID!
    title: String!
    description: String!
    location: Location!
    user: User!
  }

  type Query {
    tweets: [Tweets]
    user(id: String!): User
  }
`;

const resolvers = {
  Query: {
    async events() {
      const events = await admin
        .firestore()
        .collection('tweets')
        .get();
      return events.docs.map(event => event.data()) as Event[];
    },
    async user(_: null, args: { id: string }) {
      try {
        const userDoc = await admin
          .firestore()
          .doc(`users/${args.id}`)
          .get();
        const user = userDoc.data() as User | undefined;
        return user || new ValidationError('User ID not found');
      } catch (error) {
        throw new ApolloError(error);
      }
    }
  },
  User: {
    async tweets(user) {
      try {
        const userTweets = await admin
          .firestore()
          .collection('tweets')
          .where('userId', '==', user.id)
          .get();
        return userTweets.docs.map(tweet => tweet.data()) as Tweet[];
      } catch (error) {
        throw new ApolloError(error);
      }
    }
  },
  Tweets: {
    async user(tweet) {
      try {
        const tweetAuthor = await admin
          .firestore()
          .doc(`users/${tweet.userId}`)
          .get();
        return tweetAuthor.data() as User;
      } catch (error) {
        throw new ApolloError(error);
      }
    }
  }
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  engine: {
    apiKey: "<APOLLO ENGINE API KEY HERE>"
  },
  introspection: true
});

server.listen({ port: process.env.PORT || 4000 }).then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});
