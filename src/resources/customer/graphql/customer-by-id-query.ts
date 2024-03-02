import { gql } from "graphql-request"
import { customerFragment } from "./customer-fragment"

export const customerByIdQuery = gql`
  ${customerFragment}

  query customerById($id: ID!) {
    record: customer(id: $id) {
      ...CustomerFragment
    }
  }
`
