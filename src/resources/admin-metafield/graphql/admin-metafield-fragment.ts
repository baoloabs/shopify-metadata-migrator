import { gql } from "graphql-request"

export const adminMetafieldFragment = gql`
  fragment AdminMetafieldFragment on Metafield {
    id
    namespace
    key
    ownerType
    type
    value

    owner {
      __typename
      
      ... on Collection {
        id
        handle
      }

      ... on Company {
        id
      }

      ... on CompanyLocation {
        id
      }

      ... on Customer {
        id
        email
      }

      ... on Location {
        id
      }

      ... on Market {
        id
        handle
      }

      ... on Order {
        id
      }

      ... on Product {
        id
        handle
        isGiftCard
      }

      ... on ProductVariant {
        id
      }
    }
  }
`
