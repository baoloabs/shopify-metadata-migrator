import { gql } from "graphql-request"
import { blogFragment } from "./blog-fragment"

export const blogByIdQuery = gql`
  ${blogFragment}

  query blogById($id: ID!) {
    record: blog(id: $id) {
      ...BlogFragment
    }
  }
`
