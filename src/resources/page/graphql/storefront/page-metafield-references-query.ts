import { gql } from "graphql-request"

export const pageMetafieldReferencesQuery = gql`
  query pageMetafieldReferences ($namespace: String!, $key: String!, $first: Int!, $after: String) {
    pages (first: $first, after: $after) {
      nodes {
        id
        handle
        metafield(namespace: $namespace, key: $key) {
          id
          key
          namespace
          parentResource {
            ... on Page {
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
