import http from 'http'
import chalk from 'chalk'
import Koa from 'koa'
import cors from '@koa/cors'
import bodyParser from 'koa-bodyparser'
import { WebSocketServer } from 'ws'
import { ApolloServer } from '@apollo/server'
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer'
import { koaMiddleware } from '@as-integrations/koa'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { useServer } from 'graphql-ws/lib/use/ws'

import { typeDefs, resolvers } from './index.mjs'

const app = new Koa()
const httpServer = http.createServer(app.callback())
const graphqlSchema = makeExecutableSchema({ typeDefs, resolvers })
const apolloServer = new ApolloServer({
  schema: graphqlSchema,
  plugins: [
    ApolloServerPluginDrainHttpServer({ httpServer }),
    {
      serverWillStart: async () => ({
        drainServer: () => apolloSocketServer.dispose()
      }),
    }
  ],
})
await apolloServer.start()

app.use(cors())
app.use(bodyParser())
app.use(koaMiddleware(apolloServer))

const websocketServer = new WebSocketServer({ server: httpServer })
const apolloSocketServer = useServer({ schema: graphqlSchema }, websocketServer)

await new Promise(resolve => httpServer.listen({ port: 8080 }, resolve))
console.log(chalk.blue(`🚀 Server ready at http://localhost:8080`))
