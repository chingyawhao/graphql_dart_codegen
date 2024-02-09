# GraphQL Dart Codegen

This project is built to generate SDK that can be used to communicate with a GraphQL Apollo server. Check out `test/` folder for usage against a basic Apollo server, a file upload Apollo server or over websocket Apollo server.

## Installation

```npm install @graphql-codegen/cli graphql_dart_codegen --save-dev```

## Usage

File `graphql.codegen.ts`
```ts
import type { CodegenConfig } from '@graphql-codegen/cli'
 
const config: CodegenConfig = {
  // ...
  generates: {
    `${__dirname}/generated/graphql.dart`: {
      schema: `http://localhost:8080/root`,
      documents: `${__dirname}/**/*.graphql`,
      plugins: ['graphql_dart_codegen'],
    },
  },
}
export default config
```

```npx graphql-codegen --config path_to/graphql.codegen.ts --verbose```

# Example

With the following GraphQL file
```gql
query ViewToDo {
  displayToDos {
    id
    title
    text
    done
  }
}
```

You can use it like this
```dart
import './generated/graphql.dart';

final graphqlSdk = GraphqlSdk(
  http: 'http://server-url',
  getToken: () async => 'Bearer token',
);
final todo = await graphqlSdk.ViewToDo();
print(todo); // ViewToDo_Response_displayToDos
```