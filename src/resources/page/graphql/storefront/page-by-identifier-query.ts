import { gql } from "graphql-request"
import { pageFragment } from "./page-fragment"

export const pageByIdentifierQuery = gql`
  ${pageFragment}

  query pageByIdentifier($handle: String!) {
    record: pageByHandle(handle: $handle) {
      ...PageFragment
    }
  }
`
