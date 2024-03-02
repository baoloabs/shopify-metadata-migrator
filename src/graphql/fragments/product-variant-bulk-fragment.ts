import { gql } from "graphql-request"

export const productVariantBulkFragment = gql`
  fragment ProductVariantBulkFragment on ProductVariant {
    __typename
    barcode
    compareAtPrice
    id
    inventoryItem {
      harmonizedSystemCode
      requiresShipping
      tracked
      unitCost {
        amount
      }
    }
    inventoryPolicy
    media {
      edges {
        node {
          ...MediaFragment
        }
      }
    }
    position
    price
    requiresComponents
    selectedOptions {
      name
      value
    }
    sku
    taxCode
    taxable
    title
    weight
    weightUnit
  }
`
