import { gql } from "graphql-request"
import { metaobjectDefinitionFragment } from "./metaobject-definition-fragment"

export const metaobjectDefinitionsQuery = gql`
  ${metaobjectDefinitionFragment}

  query metaobjectDefinitions ($first: Int, $last: Int, $after: String, $before: String) {
    metaobjectDefinitions(first: $first, last: $last, after: $after, before: $before) {
      edges {
        cursor
        node {
          ...metaobjectDefinitionFragment
        }
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
`
