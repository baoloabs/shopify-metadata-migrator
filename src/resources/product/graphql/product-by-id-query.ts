import { gql } from "graphql-request"
import { productFragment } from "./product-fragment"

export const productByIdQuery = gql`
  ${productFragment}

  query productById($id: ID!) {
    record: product(id: $id) {
      ...ProductFragment
    }
  }
`
