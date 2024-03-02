import { gql } from "graphql-request"
import { locationFragment } from "./location-fragment"

export const locationByIdQuery = gql`
  ${locationFragment}

  query locationById($id: ID!) {
    record: location(id: $id) {
      ...LocationFragment
    }
  }
`
