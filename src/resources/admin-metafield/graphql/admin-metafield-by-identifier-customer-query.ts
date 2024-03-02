import { gql } from "graphql-request"
import { adminMetafieldFragment } from "./admin-metafield-fragment"

export const adminMetafieldByIdentifierCustomerQuery = gql`
  ${adminMetafieldFragment}

  query adminMetafieldByIdentifierCustomer($ownerId: ID!, $namespace: String!, $key: String!) {
    record: customer(id: $ownerId) {
      metafield(namespace: $namespace, key: $key) {
        ...AdminMetafieldFragment
      }
    }
  }
`
