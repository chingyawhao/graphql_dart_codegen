import type { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
  overwrite: true,
  generates: {
    [`${__dirname}/generated/graphql.dart`]: {
      schema: `http://localhost:8080/root`,
      documents: `${__dirname}/**/*.graphql`,
      plugins: [
        'dist/index.js'
      ],
    },
  },
}
export default config
