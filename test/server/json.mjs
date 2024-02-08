import { ApolloServer } from '@apollo/server'
import { startStandaloneServer } from '@apollo/server/standalone'

import { typeDefs, resolvers } from './index.mjs'

const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
})
const { url } = await startStandaloneServer(apolloServer, {
  listen: { port: 8080 },
})
console.log(`🚀 Server ready at ${url}`)
