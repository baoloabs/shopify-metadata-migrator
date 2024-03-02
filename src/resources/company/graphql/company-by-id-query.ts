import { gql } from "graphql-request"
import { companyFragment } from "./company-fragment"

export const companyByIdQuery = gql`
  ${companyFragment}

  query companyById($id: ID!) {
    record: company(id: $id) {
      ...CompanyFragment
    }
  }
`
