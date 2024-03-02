import { gql } from "graphql-request"
import { adminMetafieldFragment } from "./admin-metafield-fragment"

export const adminMetafieldByIdentifierCompanyQuery = gql`
  ${adminMetafieldFragment}

  query adminMetafieldByIdentifierCompany($ownerId: ID!, $namespace: String!, $key: String!) {
    record: company(id: $ownerId) {
      metafield(namespace: $namespace, key: $key) {
        ...AdminMetafieldFragment
      }
    }
  }
`
