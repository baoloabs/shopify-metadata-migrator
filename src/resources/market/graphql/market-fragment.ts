import { gql } from "graphql-request"

export const marketFragment = gql`
  fragment MarketFragment on Market {
    id
    name
  }
`
