import { gql } from "graphql-request"
import { parse } from "graphql/index"
import { metaobjectFragment } from "./metaobject-fragment"

export const metaobjectByIdentifierQuery = gql`
  ${metaobjectFragment}
  
  query metaobjectByIdentifier($handle: MetaobjectHandleInput!) {
    record: metaobjectByHandle(handle: $handle) {
      ...metaobjectFragment
    }
  }
`
