import { gql } from "graphql-request"
import { productVariantFragment } from "./product-variant-fragment"

export const productVariantByIdentifierQuery = gql`
  ${productVariantFragment}
  
  query productVariantByIdentifier($query: String!) {
    record: productVariants(first: 1, query: $query) {
      nodes {
        ...ProductVariantFragment
      }
    }
  }
`
