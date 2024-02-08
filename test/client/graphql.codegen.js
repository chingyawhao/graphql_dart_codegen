module.exports = {
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
