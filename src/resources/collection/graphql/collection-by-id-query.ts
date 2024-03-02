import { gql } from "graphql-request"
import { collectionFragment } from "./collection-fragment"

export const collectionByIdQuery = gql`
  ${collectionFragment}

  query collectionById($id: ID!) {
    record: collection(id: $id) {
      ...CollectionFragment
    }
  }
`
