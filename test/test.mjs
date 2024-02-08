#!/usr/bin/env zx

const tests = [{
  name: 'basic',
  server: `${__dirname}/server/json.mjs`,
  clients: [
    `${__dirname}/client/basic.dart`
  ]
}, {
  name: 'multipart',
  server: `${__dirname}/server/multipart.mjs`,
  clients: [
    `${__dirname}/client/basic.dart`,
    `${__dirname}/client/file.dart`
  ]
}, {
  name: 'socket',
  server: `${__dirname}/server/socket.mjs`,
  clients: [
    `${__dirname}/client/basic.dart`,
    `${__dirname}/client/subscribe.dart`
  ]
}]
for (const { name, server, clients } of tests) {
  const serverProcess = $`node ${server}`.nothrow()
  try {
    for await (const chunk of serverProcess.stdout) {
      if (chunk.includes('Server ready at')) {
        break
      }
    }
    await $`npm run build`
    await $`graphql-codegen --config ${__dirname}/client/graphql.codegen.ts`
    await $`dart format test/client/generated`
    for (const client of clients) {
      await $`dart test ${client}`
    }
  } catch(error) {
    console.error(`Tests for ${name} failed: ${error}`)
    throw error
  } finally {
    serverProcess.kill()
  }
}
