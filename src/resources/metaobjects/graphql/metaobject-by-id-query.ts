import { gql } from "graphql-request"
import { metaobjectFragment } from "./metaobject-fragment"

export const metaobjectByIdQuery = gql`
  ${metaobjectFragment}
  
  query metaobjectById ($id: ID!) {
    record: metaobject (id: $id) {
      ...metaobjectFragment
    }
  }
`
