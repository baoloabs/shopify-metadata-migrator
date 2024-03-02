import { gql } from "graphql-request"
import { adminMetafieldFragment } from "./admin-metafield-fragment"

export const adminMetafieldCreateMutation = gql`
  ${adminMetafieldFragment}
  
  mutation adminMetafieldCreate($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet (metafields: $metafields) {
      metafields {
        ...AdminMetafieldFragment
      }
      userErrors {
        field
        message
      }
    }
  }
`
