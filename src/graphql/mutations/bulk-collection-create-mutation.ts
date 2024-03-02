import { gql } from "graphql-request"

export const bulkCollectionCreateMutation = gql`
  mutation bulkCollectionCreate($input: CollectionInput!) {
    collectionCreate(input: $input) {
      collection {
        id
        ruleSet {
          appliedDisjunctively
        }
      }
      userErrors {
        message
        field
      }
    }
  }
`
