import { gql } from "graphql-request"

export const productVariantFragment = gql`
  fragment ProductVariantFragment on ProductVariant {
    id
    barcode
    selectedOptions {
      name
      value
    }
    product {
      id
      handle
    }
    sku
  }
`
