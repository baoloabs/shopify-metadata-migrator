import { gql } from "graphql-request"

export const deleteProductMutation = gql`
  mutation productDeleteAsync($productId: ID!) {
    productDeleteAsync(productId: $productId) {
      deleteProductId
      userErrors {
        field
        message
      }
    }
  }
`
