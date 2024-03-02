import { gql } from "graphql-request"
import { parse } from "graphql/index"

export const collectionAddProductsMutation = gql`
  mutation collectionAddProducts($id: ID!, $productIds: [ID!]!) {
    collectionAddProductsV2(id: $id, productIds: $productIds) {
      job {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`
