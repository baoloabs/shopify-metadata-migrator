import { gql } from "graphql-request"

export const productFragment = gql`
  fragment ProductFragment on Product {
    descriptionHtml
    giftCardTemplateSuffix
    handle
    id
    isGiftCard
    options {
      name
      position
      values
    }
    productCategory {
      productTaxonomyNode {
        name
        id
      }
    }
    productType
    seo {
      description
      title
    }
    status
    tags
    templateSuffix
    title
    vendor
  }
`
