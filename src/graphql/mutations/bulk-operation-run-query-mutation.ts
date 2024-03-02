import { gql } from "graphql-request"
import { bulkOperationFragment } from "../fragments/bulk-operation-fragment"

export const bulkOperationRunQueryMutation = gql`
  mutation bulkOperationRunQuery($query: String!) {
    bulkOperationRunQuery(query: $query) {
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
