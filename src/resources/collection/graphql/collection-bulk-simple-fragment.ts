import { gql } from "graphql-request"

export const collectionBulkSimpleFragment = gql`
  fragment CollectionBulkSimpleFragment on Collection {
    __typename
    descriptionHtml
    id
    handle
    image {
      altText
      url
    }
    products {
      edges {
        node {
          __typename
          id
          handle
        }
      }
    }
    productsCount
    seo {
      description
      title
    }
    sortOrder
    templateSuffix
    title
  }
`
