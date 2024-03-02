import { gql } from "graphql-request"

export const bulkCollectionUpdateMutation = gql`
  mutation bulkCollectionUpdate($input: CollectionInput!) {
    collectionUpdate(input: $input) {
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
