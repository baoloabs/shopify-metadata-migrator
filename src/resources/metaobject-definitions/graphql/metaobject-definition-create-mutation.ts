import { gql } from "graphql-request"
import { metaobjectDefinitionFragment } from "./metaobject-definition-fragment"

export const metaobjectDefinitionCreateMutations = gql`
  ${metaobjectDefinitionFragment}
  
  mutation metaobjectDefinitionCreate($definition: MetaobjectDefinitionCreateInput!) {
    metaobjectDefinitionCreate(definition: $definition) {
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
