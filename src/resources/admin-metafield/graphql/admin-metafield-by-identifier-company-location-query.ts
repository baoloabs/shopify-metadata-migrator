import { gql } from "graphql-request"
import { adminMetafieldFragment } from "./admin-metafield-fragment"

export const adminMetafieldByIdentifierCompanyLocationQuery = gql`
  ${adminMetafieldFragment}

  query adminMetafieldByIdentifierCompanyLocation($ownerId: ID!, $namespace: String!, $key: String!) {
    record: companyLocation(id: $ownerId) {
      metafield(namespace: $namespace, key: $key) {
        ...AdminMetafieldFragment
      }
    }
  }
`
