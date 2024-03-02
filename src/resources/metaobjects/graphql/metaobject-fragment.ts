import { gql } from "graphql-request"

export const metaobjectFragment = gql`
  fragment metaobjectFragment on Metaobject {
    capabilities {
      publishable {
        status
      }
    }
    fields {
      key
      value
    }
    handle
    id
    type
  }
`
