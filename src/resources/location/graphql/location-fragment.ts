import { gql } from "graphql-request"

export const locationFragment = gql`
  fragment LocationFragment on Location {
    id
    name
  }
`
