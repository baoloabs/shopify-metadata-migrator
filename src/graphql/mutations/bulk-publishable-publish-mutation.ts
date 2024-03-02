import { gql } from "graphql-request"

export const bulkPublishablePublishMutation = gql`
  mutation publishablePublish($id: ID!, $input: [PublicationInput!]!) {
    publishablePublish(id: $id, input: $input) {
      publishable {
        __typename
      }
      userErrors {
        field
        message
      }
    }
  }
`
