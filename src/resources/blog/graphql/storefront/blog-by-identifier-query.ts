import { gql } from "graphql-request"
import { blogFragment } from "./blog-fragment"

export const blogByIdentifierQuery = gql`
  ${blogFragment}

  query blogByIdentifier($handle: String!) {
    record: blogByHandle(handle: $handle) {
      ...BlogFragment
    }
  }
`
