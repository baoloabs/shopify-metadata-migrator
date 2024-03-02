import { gql } from "graphql-request"
import { metaobjectFragment } from "./metaobject-fragment"

export const metaobjectsQuery = gql`
  ${metaobjectFragment}
  
  query metaobjects ($type: String!, $first: Int, $last: Int, $after: String, $before: String) {
    metaobjects(type: $type, first: $first, last: $last, after: $after, before: $before) {
      edges {
        node {
          ...metaobjectFragment
        }
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
`
