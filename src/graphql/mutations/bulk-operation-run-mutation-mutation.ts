import { gql } from "graphql-request"
import { bulkOperationFragment } from "../fragments/bulk-operation-fragment"

export const bulkOperationRunMutationMutation = gql`
  mutation bulkOperationRunMutation($mutation: String!, $stagedUploadPath: String!) {
    bulkOperationRunMutation(mutation: $mutation, stagedUploadPath: $stagedUploadPath) {
      bulkOperation {
        ...BulkOperationFragment
      }
      userErrors {
        field
        message
      }
    }
  }
  
  ${bulkOperationFragment}
`
