import { gql } from "graphql-request"
import { marketFragment } from "./market-fragment"

export const marketByIdentifierQuery = gql`
  ${marketFragment}

  query marketByIdentifier($after: String) {
    records: markets(first: 250, after: $after) {
      nodes {
        ...MarketFragment
      }
      
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`
