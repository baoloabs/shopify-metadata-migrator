import { gql } from "graphql-request"

export const bulkProductCreateMutation = gql`
  mutation bulkProductCreate($input: ProductInput!, $mediaInput: [CreateMediaInput!]) {
    productCreate(input: $input, media: $mediaInput) {
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
