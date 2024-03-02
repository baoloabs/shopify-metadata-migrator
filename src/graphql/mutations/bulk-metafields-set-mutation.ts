import { gql } from "graphql-request"

export const bulkMetafieldsSetMutation = gql`
  mutation bulkMetafieldsSet($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`
