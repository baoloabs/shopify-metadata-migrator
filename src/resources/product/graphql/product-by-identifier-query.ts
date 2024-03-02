import { gql } from "graphql-request"
import { productFragment } from "./product-fragment"

export const productByIdentifierQuery = gql`
  ${productFragment}
  
  query productByIdentifier($handle: String!) {
    record: productByHandle(handle: $handle) {
      ...ProductFragment
    }
  }
`
