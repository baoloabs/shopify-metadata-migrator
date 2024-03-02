import { gql } from "graphql-request"

export const metaobjectDefinitionFragment = gql`
  fragment metaobjectDefinitionFragment on MetaobjectDefinition {
    access {
      admin
      storefront
    }
    capabilities {
      publishable {
        enabled
      }
      translatable {
        enabled
      }
    }
    description
    displayNameKey
    fieldDefinitions {
      description
      key
      name
      required
      type {
        name
        category
      }
      validations {
        name
        type
        value
      }
    }
    id
    name
    type
  }
`
