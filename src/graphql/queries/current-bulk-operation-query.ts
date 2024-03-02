import { gql } from "graphql-request"
import { bulkOperationFragment } from "../fragments/bulk-operation-fragment"

export const currentBulkOperationQuery = gql`
  query CurrentBulkOperation($type: BulkOperationType) {
    currentBulkOperation(type: $type) {
      ...BulkOperationFragment
    }
  }
  
  ${bulkOperationFragment}
`
