import { gql } from "graphql-request"
import { pageFragment } from "./page-fragment"

export const pageByIdQuery = gql`
  ${pageFragment}

  query pageById($id: ID!) {
    record: page(id: $id) {
      ...PageFragment
    }
  }
`
