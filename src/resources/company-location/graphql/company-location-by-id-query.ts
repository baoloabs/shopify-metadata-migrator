import { gql } from "graphql-request"
import { companyLocationFragment } from "./company-location-fragment"

export const companyLocationByIdQuery = gql`
  ${companyLocationFragment}

  query companyLocationById($id: ID!) {
    record: companyLocation(id: $id) {
      ...CompanyLocationFragment
    }
  }
`
