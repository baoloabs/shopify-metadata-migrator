import { gql } from "graphql-request"

export const metaobjectsTypesQuery = gql`
  query metaobjectTypes ($first: Int, $last: Int, $after: String, $before: String) {
    metaobjectDefinitions(first: $first, last: $last, after: $after, before: $before) {
      edges {
        cursor
        node {
          type
        }
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
`
