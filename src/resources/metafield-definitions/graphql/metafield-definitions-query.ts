import { gql } from "graphql-request"
import { metafieldDefinitionFragment } from "./metafield-definition-fragment"

export const metafieldDefinitionsQuery = gql`
  ${metafieldDefinitionFragment}
  
  query metafieldDefinitions (
    $first: Int,
    $last: Int,
    $after: String,
    $before: String,
    $ownerType: MetafieldOwnerType!,
    $sortKey: MetafieldDefinitionSortKeys,
    $reverse: Boolean,
  ) {
    metafieldDefinitions(
      first: $first,
      last: $last,
      after: $after,
      before: $before,
      ownerType: $ownerType,
      sortKey: $sortKey,
      reverse: $reverse
    ) {
      edges {
        cursor
        node {
          ...metafieldDefinitionFragment
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`
