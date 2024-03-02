import { gql } from "graphql-request"
import { parse } from "graphql/index"
import { metaobjectDefinitionFragment } from "./metaobject-definition-fragment"

export const metaobjectDefinitionByIdQuery = gql`
  ${metaobjectDefinitionFragment}
  
  query metaobjectDefinitionById($id: ID!) {
    record: metaobjectDefinition(id: $id) {
      ...metaobjectDefinitionFragment
    }
  }
`
