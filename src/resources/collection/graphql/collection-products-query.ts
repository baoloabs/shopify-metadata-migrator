import { gql } from "graphql-request"
import { parse } from "graphql/index"

export const collectionProductsQuery = gql`
  query collectionProducts ($id: ID!, $after: String) {
    collection(id: $id) {
      id
      
      products (first: 50, after: $after) {
        nodes {
          id
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`
