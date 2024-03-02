import { gql } from "graphql-request"

export const SimpleProductIdFragment = gql`
  fragment SimpleProductIdFragment on Product {
    __typename
    id
    handle
  }
`
