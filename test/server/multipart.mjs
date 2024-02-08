import http from 'http'
import path from 'path'
import url from 'url'
import chalk from 'chalk'
import Koa from 'koa'
import cors from '@koa/cors'
import bodyParser from 'koa-bodyparser'
import serve from 'koa-static'
import { ApolloServer } from '@apollo/server'
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer'
import { koaMiddleware } from '@as-integrations/koa'
import graphqlUploadKoa from 'graphql-upload/graphqlUploadKoa.mjs'

import { typeDefs, resolvers } from './index.mjs'

const app = new Koa()
const httpServer = http.createServer(app.callback())
const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
})
await apolloServer.start()

app.use(cors())
app.use(serve(`${path.dirname(url.fileURLToPath(import.meta.url))}/public`))
app.use(bodyParser())
app.use(graphqlUploadKoa({ maxFileSize: 10000000, maxFiles: 10 }))
app.use(koaMiddleware(apolloServer))
await new Promise(resolve => httpServer.listen({ port: 8080 }, resolve))
console.log(chalk.blue(`🚀 Server ready at http://localhost:8080`))
