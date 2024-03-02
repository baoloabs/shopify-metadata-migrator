import { gql } from "graphql-request"
import { collectionFragment } from "./collection-fragment"

export const collectionByIdentifierQuery = gql`
  ${collectionFragment}
  
  query collectionByIdentifier($handle: String!) {
    record: collectionByHandle(handle: $handle) {
      ...CollectionFragment
    }
  }
`
