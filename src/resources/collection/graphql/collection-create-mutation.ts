import { gql } from "graphql-request"
import { collectionFragment } from "./collection-fragment"

export const collectionCreateMutation = gql`
  mutation collectionCreate($input: CollectionInput!) {
    collectionCreate(input: $input) {
      collection {
        ...CollectionFragment
      }
      userErrors {
        field
        message
      }
    }
  }

  ${collectionFragment}
`
