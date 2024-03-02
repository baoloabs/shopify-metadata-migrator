import { gql } from "graphql-request"

export const bulkProductVariantUpdateMediaMutation = gql`
  mutation bulkProductVariantUpdateMedia($input: ProductVariantInput!) {
    productVariantUpdate(input: $input) {
      product {
        id
      }
      
      productVariant {
        id
        media(first: 10) {
          edges {
            node {
              id
              alt
            }
          }
        }
      }
      
      userErrors {
        field
        message
      }
    }
  }
`
