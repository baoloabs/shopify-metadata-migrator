import { gql } from "graphql-request"
import { productVariantFragment } from "./product-variant-fragment"

export const productVariantByIdQuery = gql`
  ${productVariantFragment}

  query productVariantById($id: ID!) {
    record: productVariant(id: $id) {
      ...ProductVariantFragment
    }
  }
`
