import { gql } from "graphql-request"

export const articleMetafieldReferencesQuery = gql`
  query articleMetafieldReferences ($namespace: String!, $key: String!, $first: Int!, $after: String) {
    articles (first: $first, after: $after) {
      nodes {
        id
        handle
        metafield(namespace: $namespace, key: $key) {
          id
          key
          namespace
          parentResource {
            ... on Article {
              __typename
              id
            }
          }
          value
        }
      }
    }
  }
`
