import { gql } from "graphql-request"

export const bulkOperationFragment = gql`
  fragment BulkOperationFragment on BulkOperation {
    id
    status
    errorCode
    createdAt
    completedAt
    objectCount
    fileSize
    url
    partialDataUrl
  }
`
