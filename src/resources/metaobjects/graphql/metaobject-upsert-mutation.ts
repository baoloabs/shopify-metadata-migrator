import { gql } from "graphql-request"
import { metaobjectFragment } from "./metaobject-fragment"

export const metaobjectUpsertMutation = gql`
  ${metaobjectFragment}

  mutation metaobjectUpsert($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) {
    metaobjectUpsert(handle: $handle, metaobject: $metaobject) {
      metaobject {
        ...metaobjectFragment
      }
      userErrors {
        field
        message
      }
    }
  }
`
