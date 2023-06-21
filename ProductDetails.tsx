import { useRouter } from 'next/router'
import Script from 'next/script'
import { useTranslation } from 'next-i18next'
import React, { useCallback, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import {
  ButtonVariantEnum,
  CountryCodeEnum,
  HeadingEnum,
  PaymentTypeEnum,
  ProductDetailsComponentType,
  ProductStatusEnum,
  StatusMessageEnum,
} from '../../../types/content'
import {
  addWarrantyThunk,
  resetWarrantyAction,
  warrantyDetailsSelector,
} from '../../../redux/slices/warranty'
import Heading from '../../atoms/Heading'
import Image from '../../atoms/Image'
import ProductLabel from '../../atoms/ProductLabel'
import ProductMediaCarousel from '../../molecules/ProductMediaCarousel'
import ProductStatusIcon from '../../molecules/ProductStatusIcon'
import ProductVariants from '../../molecules/ProductVariants'
import AddToCart from '../AddToCart'
import ProductWarranty from '../ProductWarranty'
import ProductOverview from '../ProductOverview'
import ProductTabs from '../ProductTabs'
import localesFactory from '../../../lib/api/l18n/LocalesFactory'
import Button from '../../atoms/Button'
import Storelist from '../Storelist'
import { cartItemsSelector } from '../../../redux/slices/cart'
import { ShoppingBagIcon } from '../../atoms/Icon'
import BundleDescription from '../../molecules/BundleDescription'
import Grid from '../../atoms/Grid'
import { getDiscountPercantage } from '../../../util/apiUtils'
import gtmDatalayer from '../../../util/gtmUtils'
import ProductDetailsStructuredData from './ProductDetailsStructuredData'
import StatusMessage from '../../atoms/StatusMessage'
import { ButtonLink } from '../../atoms/Button/Button'

const handleCarouselModal = (toggleCarousel, setToggleCarousel) => {
  setToggleCarousel(!toggleCarousel)
}

const goToProductReview = () => {
  const selectedElement = document.getElementById('product-review')
  selectedElement?.scrollIntoView({
    behavior: 'smooth',
  })
}

const galleryClassProvider = (media, index) => {
  if (index === 0) {
    return `col-span-12 min-h-fit sm:min-h-[500px]`
  }
  switch (media.length) {
    case 1:
      return `col-span-12 m-hide`
    case 2:
      return `col-span-12 m-hide`
    case 3:
      return `col-span-6 m-hide`
    case 4:
      return `col-span-4 m-hide`
    default:
      return `col-span-6 m-hide`
  }
}

const galleryLayoutGenerator = (
  product,
  toggleCarousel,
  setToggleCarousel,
  setCarouselCurrItem
) => {
  return (
    <>
      {product.media.map((mediaObj, index) => {
        if (index > 4) {
          return
        }
        return (
          <div
            key={`prdm${index}`}
            className={`relative w-full ${galleryClassProvider(
              product.media,
              index
            )}`}
            onClick={() => {
              handleCarouselModal(toggleCarousel, setToggleCarousel)
              setCarouselCurrItem(index)
            }}
          >
            {mediaObj.type === 'img' && (
              <Image
                src={mediaObj.src}
                alt={mediaObj.alt}
                layout="intrinsic"
                width={1000}
                height={1000}
                objectFit="contain"
              />
            )}
          </div>
        )
      })}
    </>
  )
}

const moreButtonForCarousel = (
  product,
  toggleCarousel,
  setToggleCarousel,
  setCarouselCurrItem
) => {
  return (
    <>
      {product.media.length > 5 && (
        <div
          className="absolute bottom-0 right-4 bg-primary-900 text-white rounded-full h-12 w-12 cmn-inline-center m-hide"
          onClick={() => {
            handleCarouselModal(toggleCarousel, setToggleCarousel)
            setCarouselCurrItem(0)
          }}
        >
          {product.media.length - 5}+
        </div>
      )}
    </>
  )
}

const ProductDetails: React.FunctionComponent<ProductDetailsComponentType> = ({
  product,
}) => {
  const { locale } = useRouter()
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const warrantyDetails = useSelector(warrantyDetailsSelector)

  const [toggleCarousel, setToggleCarousel] = useState(false)
  const [carouselCurrItem, setCarouselCurrItem] = useState(0)
  const [storeModal, setStoreModal] = useState(false)
  const [isTestFreaksLoaded, setIsTestFreaksLoaded] = useState(false)
  const [showNoReviewMsg, setShowNoReviewMsg] = useState(false)
  const cartItems = useSelector(cartItemsSelector)
  const item = cartItems.find((item) => {
    if (item.sku === product.sku) {
      return item
    }
  })

  const discountValue = product.price
    ? getDiscountPercantage(product.price.value, product.price.valueUnmodified)
    : 0

  const handleModal = () => {
    setStoreModal(true)
  }

  const {
    country: { id: countryId },
    hreflang,
  } = localesFactory.createFromHrefLang(locale).current

  const testFreaksClientID = () => {
    switch (hreflang) {
      case 'en-KW':
        return 'xcite.com'
      case 'en-SA':
        return 'xcite.com.sa'
      case 'ar-KW':
        return 'xcite.com-ar'
      case 'ar-SA':
        return 'xcite.com.sa-ar'
    }
  }

  const loadWarrantyData = useCallback(
    (locale: string) => {
      try {
        dispatch(
          addWarrantyThunk({
            sku: product.sku,
            locale,
          })
        )
      } catch (e) {
        console.error(e)
      }
    },
    [dispatch, product.sku]
  )

  useEffect(() => {
    gtmDatalayer('dh_view_item', 'ProductPageView', 'Product Page')
    loadWarrantyData(hreflang)
    return () => {
      dispatch(resetWarrantyAction())
    }
  }, [dispatch, loadWarrantyData, hreflang])

  useEffect(() => {
    const testFreaks = globalThis?.testFreaks
    const showReviews = product.sku && (isTestFreaksLoaded || testFreaks)
    if (product.sku && (isTestFreaksLoaded || testFreaks)) {
      testFreaks.push(['reset'])
      testFreaks.push(['setProductId', product.sku])
      testFreaks.push(['load', ['badge', 'reviews', 'qa']])
      testFreaks.push([
        'onBadgeClick',
        function () {
          goToProductReview()
        },
      ])
    }

    const showNoReviewMsgTimer = setTimeout(
      () => setShowNoReviewMsg(showReviews),
      200
    )
    return () => {
      clearTimeout(showNoReviewMsgTimer)
    }
  }, [product.sku, isTestFreaksLoaded])

  let sortedLabels
  if (product.labels) {
    sortedLabels = product.labels.slice().sort((a, b) => a.localeCompare(b))
  }

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://js.testfreaks.com/onpage/${testFreaksClientID()}/head.js`}
        onLoad={() => {
          setIsTestFreaksLoaded(true)
        }}
      />
      <ProductDetailsStructuredData product={product} />
      <div className="flex mx-auto mb-11 md:mb-32 flex-col sm:flex-row xl:container">
        <div className="flex-1">
          <div className="relative grid grid-cols-12 p-2 cursor-pointer">
            {sortedLabels && (
              <div className="flex flex-wrap z-10 gap-2 absolute top-5 left-5 right-5 sm:top-10 sm:left-10 sm:right-10">
                {sortedLabels.map(
                  (label, index) =>
                    index < 2 &&
                    label != '' && (
                      <ProductLabel key={index}>{label}</ProductLabel>
                    )
                )}
              </div>
            )}
            {galleryLayoutGenerator(
              product,
              toggleCarousel,
              setToggleCarousel,
              setCarouselCurrItem
            )}
            {moreButtonForCarousel(
              product,
              toggleCarousel,
              setToggleCarousel,
              setCarouselCurrItem
            )}
          </div>
        </div>
        <div className="flex-1 pt-10 px-5 sm:grid sm:grid-cols-6 sm:gap-x-5 sm:pl-10 sm:pt-24 lg:pl-20">
          <div className="sm:col-span-5 md:col-start-1">
            <div className="flex items-center justify-start mb-2 sm:justify-start gap-x-5 sm:gap-x-10">
              {product.brand && (
                <Heading type={HeadingEnum.h5}>{product.brand}</Heading>
              )}
              <span className="typography-small">
                {t('pdp_product_sku_label')}: {product.sku}
              </span>
              <ProductStatusIcon methodName={product.status} />
            </div>
            <Heading
              type={HeadingEnum.h1}
              className={`font-body rtl:font-rtl typography-default mb-5 sm:typography-h1 sm:mb-10`}
            >
              {product.name}
            </Heading>
            <div className="rating-stars min-h-[46px] sm:min-h-[70px] pb-5 sm:pb-10">
              <div id="testfreaks-badge"></div>
              {showNoReviewMsg && (
                <div
                  id="testfreaks-badge-label"
                  className="hidden cursor-pointer underline"
                  onClick={() => {
                    goToProductReview()
                  }}
                >
                  {t('pdp_product_default_review_label')}
                </div>
              )}
            </div>

            {product.status !== ProductStatusEnum.Discontinued && (
              <Heading type={HeadingEnum.h3} className="mb-10">
                {discountValue > 0 ? (
                  <div className="flex items-baseline flex-wrap gap-3">
                    <span className={`text-base line-through font-body`}>
                      {product.price?.formattedPriceUnmodified}
                    </span>
                    <span className={`text-3xl text-functional-red-800`}>
                      {product.price?.formattedPrice}
                    </span>
                    <span
                      className={`text-base bg-functional-red-600 text-white px-2 py-[3px] leading-1 align-text-top inline-block font-body font-normal self-center mb-1`}
                    >
                      {discountValue}%
                    </span>
                  </div>
                ) : (
                  product.price?.formattedPrice
                )}
                {countryId === CountryCodeEnum.SaudiArabia && (
                  <div className="typography-small">
                    {t('product_inclusive_of_vat_label')}
                  </div>
                )}
              </Heading>
            )}
            {countryId === CountryCodeEnum.SaudiArabia &&
              product.paymentType &&
              product.paymentType.includes(PaymentTypeEnum.Tamara) && (
                <div
                  className="tamara-product-widget"
                  data-lang={
                    hreflang && hreflang.startsWith('ar') ? 'ar' : 'en'
                  }
                  data-price={JSON.stringify(product.price?.value)}
                  data-currency="SAR"
                  data-country-code="SA"
                  data-color-type="default"
                  data-show-border="true"
                  data-payment-type="installment"
                  data-domain="www.xcite.com.sa"
                  data-number-of-installments="3"
                  data-disable-installment="false"
                  data-disable-paylater="true"
                />
              )}

            {product.dimensions && (
              <ProductVariants options={product.dimensions} />
            )}
            {warrantyDetails.packages.length > 0 && (
              <ProductWarranty
                sku={product.sku}
                warrantyDetails={warrantyDetails}
              />
            )}
            <div className="my-14">Available Offer
            <div className="col-span-4 mt-2.5 sm:col-span-7 sm:mb-12 md:col-start-2 md:col-span-6 sm:pr-4 mb-56">
            <div className="flex flex-col gap-2">
            <StatusMessage
                    key="1"
                    type={StatusMessageEnum.Offer}
                    className="text-xs animate-appearFromAbove"
                  >
                    test
                    <ButtonLink
                      variant={ButtonVariantEnum.textLink}
                      href=""
                      className="text-xs"
                    >
                      {t('cart_potential_promotion_link_text')}
                    </ButtonLink>
                  </StatusMessage>
              </div>
              </div>
            </div>
            <div className="my-14">
              {product.status === 'OutOfStock' &&
              product.sections.quickOverview?.content.shipping?.deliveryMethods.find(
                (delivery) => delivery.name === 'ClickAndCollect'
              ) ? (
                <Button
                  variant={ButtonVariantEnum.secondaryOnLight}
                  className={`w-full sm:max-w-[335px]`}
                  onClick={handleModal}
                >
                  <div className="flex flex-row gap-2 justify-center">
                    <span className="">
                      {t(
                        'pdp_product_sections_quickOverview_content_shipping_chooseStore'
                      )}
                    </span>
                    <ShoppingBagIcon className="h-6 w-6 stroke-current" />
                  </div>
                </Button>
              ) : (
                <AddToCart
                  buttonVariant={ButtonVariantEnum.primaryCta}
                  className={`w-full sm:max-w-[335px]`}
                  pageType="ProductView"
                  sku={product.sku}
                  warranty={warrantyDetails?.selectedWarranty?.warranty}
                  disabled={product.status !== ProductStatusEnum.InStock}
                >
                  {t('addToCart_button_label')}
                </AddToCart>
              )}
            </div>
            {product.sections.quickOverview && (
              <ProductOverview
                {...product.sections.quickOverview}
                sku={product.sku}
                prodStatus={product.status}
              />
            )}
          </div>
        </div>
      </div>
      {product.productType === 'product-type-bundle' &&
      product.sections.bundleChildren ? (
        <Grid>
          <div className="col-span-full mb-12">
            <BundleDescription bundleItems={product.sections.bundleChildren} />
          </div>
        </Grid>
      ) : (
        <ProductTabs sections={product.sections} productname={product.name} />
      )}
      {toggleCarousel && (
        <ProductMediaCarousel
          pItems={product.media}
          carouselCurrItem={carouselCurrItem}
          handleModal={setToggleCarousel}
        ></ProductMediaCarousel>
      )}
      {storeModal && (
        <Storelist
          sku={product.sku}
          onCloseModal={() => setStoreModal(false)}
          skuLineItemId={item ? item?.id : 'noSku'}
          onConfirmModalClose={() => setStoreModal(false)}
        />
      )}
    </>
  )
}

export default ProductDetails
