import { gql } from "graphql-request"

export const blogMetafieldReferencesQuery = gql`
  query blogMetafieldReferences ($namespace: String!, $key: String!, $first: Int!, $after: String) {
    blogs (first: $first, after: $after) {
      nodes {
        id
        handle
        metafield(namespace: $namespace, key: $key) {
          id
          key
          namespace
          parentResource {
            ... on Blog {
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
