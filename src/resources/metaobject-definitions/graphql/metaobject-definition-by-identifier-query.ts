import { gql } from "graphql-request"
import { parse } from "graphql/index"
import { metaobjectDefinitionFragment } from "./metaobject-definition-fragment"

export const metaobjectDefinitionByIdentifierQuery = gql`
  ${metaobjectDefinitionFragment}
  
  query metaobjectDefinitionByIdentifier($type: String!) {
    record: metaobjectDefinitionByType(type: $type) {
      ...metaobjectDefinitionFragment
    }
  }
`
