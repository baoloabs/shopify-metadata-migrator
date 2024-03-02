import { gql } from "graphql-request"

export const collectionFragment = gql`
  fragment CollectionFragment on Collection {
    descriptionHtml
    id
    handle
    image {
      altText
      url
    }
    productsCount
    ruleSet {
      appliedDisjunctively
      rules {
        column
        condition
        conditionObject {
          __typename

          ... on CollectionRuleMetafieldCondition {
            metafieldDefinition {
              id
            }
          }
          
          ... on CollectionRuleProductCategoryCondition {
            value {
              id
              name
            }
          }
        }
        relation
      }
    }
    seo {
      description
      title
    }
    sortOrder
    templateSuffix
    title
  }
`
