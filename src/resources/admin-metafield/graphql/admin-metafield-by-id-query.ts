import { gql } from "graphql-request"
import { adminMetafieldFragment } from "./admin-metafield-fragment"

export const adminMetafieldByIdQuery = gql`
  ${adminMetafieldFragment}

  query adminMetafieldById($id: ID!) {
    record: node(id: $id) {
      ...AdminMetafieldFragment
    }
  }
`
