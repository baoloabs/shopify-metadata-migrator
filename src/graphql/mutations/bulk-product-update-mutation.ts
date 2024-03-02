import { gql } from "graphql-request"

export const bulkProductUpdateMutation = gql`
  mutation bulkProductUpdate($input: ProductInput!, $mediaInput: [CreateMediaInput!]) {
    productUpdate(input: $input, media: $mediaInput) {
      product {
        id
      }
      userErrors {
        message
        field
      }
    }
  }
`
