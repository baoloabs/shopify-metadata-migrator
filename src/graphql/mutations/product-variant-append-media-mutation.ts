import { gql } from "graphql-request"

export const productVariantAppendMediaMutation = gql`
  mutation productVariantAppendMedia($productId: ID!, $variantMedia: [ProductVariantAppendMediaInput!]!) {
    productVariantAppendMedia(productId: $productId, variantMedia: $variantMedia) {
      product {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`
