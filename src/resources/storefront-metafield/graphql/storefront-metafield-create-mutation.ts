import { gql } from "graphql-request"

export const StorefrontMetafieldCreateMutation = gql`
  mutation storefrontMetafieldCreate($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet (metafields: $metafields) {
      metafields {
        key
      }
      userErrors {
        field
        message
      }
    }
  }
`
