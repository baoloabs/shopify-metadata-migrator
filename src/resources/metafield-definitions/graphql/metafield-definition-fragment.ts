import { gql } from "graphql-request"

export const metafieldDefinitionFragment = gql`
  fragment metafieldDefinitionFragment on MetafieldDefinition {
    description
    key
    name
    namespace
    id
    ownerType
    pinnedPosition
    standardTemplate {
      id
    }
    type {
      category
      name
    }
    useAsCollectionCondition
    validations {
      name
      type
      value
    }
    visibleToStorefrontApi
  }
`
