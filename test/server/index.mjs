import path from 'path'
import url from 'url'
import fs from 'fs'
import { PubSub, withFilter } from 'graphql-subscriptions'
import GraphQLUpload from 'graphql-upload/GraphQLUpload.mjs'

export const typeDefs = `
  type Query {
    displayToDos: [ToDo!]!
  }
  type Mutation {
    addToDo(title: String!, text: String!, files: [Upload!]!): ToDo!
    updateToDo(id: ID!, title: String, text: String, files: [Upload!]): ToDo!
    doneToDo(id: ID!): ToDo!
  }
  type Subscription {
    subscribeToDoChanges(id: ID!): ToDo!
  }
  scalar Upload
  type ToDo {
    id: ID!
    title: String!
    text: String!
    files: [File!]!
    done: Boolean!
  }
  type File {
    id: String!
    name: String!
    url: String!
  }
`

const pubsub = new PubSub()
const todos = [
  { id: '0', title: 'Try out codegen', text: "Let's go...", files: [], done: false },
]
/** @return {Promise<{id: string; name: string; url: string}[]>} */
const saveUploadedFile = async (id, files) => {
  const uploaded = await Promise.all(files)
  const dirname = path.dirname(url.fileURLToPath(import.meta.url))
  if (!fs.existsSync(`${dirname}/public`)) {
    fs.mkdirSync(`${dirname}/public`)
  }
  return Promise.all(uploaded.map((file, index) =>
    new Promise((resolve, reject) => {
      const folder = `addToDo-${id}-${index}`
      if (!fs.existsSync(`${dirname}/public/${folder}`)) {
        fs.mkdirSync(`${dirname}/public/${folder}`)
      }
      const url = `${folder}/${file.filename}`
      const writeStream = fs.createWriteStream(
        `${dirname}/public/${url}`
      )
      file.createReadStream().pipe(writeStream)
      writeStream.on('error', reject)
      writeStream.on('finish', () =>
        resolve({
          id: index.toString(),
          name: file.filename,
          url: `http://localhost:8080/${url}`
        })
      )
    })
  ))
}
export const resolvers = {
  Query: {
    displayToDos: () => todos
  },
  Mutation: {
    addToDo: async (_, { title, text, files }) => {
      const id = todos.length.toString()
      const saved = await saveUploadedFile(id, files)
      const newToDo = { id, title, text, files: saved, done: false }
      todos.push(newToDo)
      return newToDo
    },
    updateToDo: async (_, { id, title, text, files }) => {
      const index = todos.findIndex(todo => todo.id === id)
      if (index === -1) throw new Error('ToDo not found')
      const saved = files
        ? await saveUploadedFile(id, files)
        : undefined
      todos[index] = {
        ...todos[index],
        title: title ?? todos[index].title,
        text: text ?? todos[index].text,
        files: saved ?? todos[index].files
      }
      pubsub.publish('TODO_CHANGED', { subscribeToDoChanges: todos[index] })
      return todos[index]
    },
    doneToDo: (_, { id }) => {
      const index = todos.findIndex(todo => todo.id === id)
      if (index === -1) throw new Error('ToDo not found')
      todos[index].done = true
      pubsub.publish('TODO_CHANGED', { subscribeToDoChanges: todos[index] })
      return todos[index]
    }
  },
  Subscription: {
    subscribeToDoChanges: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(['TODO_CHANGED']),
        (payload, variables) => {
          return payload.subscribeToDoChanges.id === variables.id
        }
      )
    }
  },
  Upload: GraphQLUpload,
}
