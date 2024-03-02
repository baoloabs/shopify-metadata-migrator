import { gql } from "graphql-request"
import { locationFragment } from "./location-fragment"

export const locationByIdentifierQuery = gql`
  ${locationFragment}

  query locationByIdentifier($query: String!) {
    record: locations(first: 1, query: $query) {
      nodes {
        ...LocationFragment
      }
    }
  }
`
