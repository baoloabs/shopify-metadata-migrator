import { gql } from "graphql-request"
import { mediaFragment } from "../../../graphql/fragments/media-fragment"
import { productVariantBulkFragment } from "../../../graphql/fragments/product-variant-bulk-fragment"

export const productBulkFragment = gql`
  fragment ProductBulkFragment on Product {
    __typename
    descriptionHtml
    giftCardTemplateSuffix
    handle
    id
    isGiftCard
    hasVariantsThatRequiresComponents
    media {
      edges {
        node {
          ...MediaFragment
        }
      }
    }
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
    variants {
      edges {
        node {
          ...ProductVariantBulkFragment
        }
      }
    }
    vendor
  }
  
  ${mediaFragment}
  ${productVariantBulkFragment}
`
