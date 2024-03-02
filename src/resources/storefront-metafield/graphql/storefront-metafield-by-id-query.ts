import { gql } from "graphql-request"
import { adminMetafieldFragment } from "../../admin-metafield/graphql/admin-metafield-fragment"

export const StorefrontMetafieldByIdQuery = gql`
  ${adminMetafieldFragment}
  
  query storefrontMetafieldById($id: ID!) {
    record: node(id: $id) {
      ...AdminMetafieldFragment
    }
  }
`
