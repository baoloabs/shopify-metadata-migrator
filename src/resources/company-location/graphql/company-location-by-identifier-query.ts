import { gql } from "graphql-request"
import { companyLocationFragment } from "./company-location-fragment"

export const companyLocationByIdentifierQuery = gql`
  ${companyLocationFragment}

  query companyLocationByIdentifier($query: String!) {
    record: companyLocations(first: 1, query: $query) {
      nodes {
        ...CompanyLocationFragment
      }
    }
  }
`
