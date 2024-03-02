import { gql } from "graphql-request"
import { metaobjectDefinitionFragment } from "./metaobject-definition-fragment"

export const metaobjectDefinitionUpdateMutations = gql`
  ${metaobjectDefinitionFragment}
  
  mutation metaobjectDefinitionUpdate($id: ID!, $definition: MetaobjectDefinitionUpdateInput!) {
    metaobjectDefinitionUpdate(id: $id, definition: $definition) {
      metaobjectDefinition {
        ...metaobjectDefinitionFragment
      }
      userErrors {
        field
        message
      }
    }
  }
`
