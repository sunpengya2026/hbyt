/**
 *naiveUI组件样式调整
 **/
 const $heightNormal = '32px'
 const $heightLarge = '36px'
 const $fontSizeNormal = '12px'
 const $fontSizeLarge = '14px'
 const $borderRadius = '4px'
 const $railHeight = '8px'
 export const commonThemeOverrides = {
   common: {
     heightMedium: '32px',
     heightLarge: '36px',
     borderRadius: '4px',
     fontSizeSmall: '12px',
     fontSizeMedium: '14px',
     fontSizeLarge: '16px'
   },
   Button: {
     fontSizeSmall: $fontSizeNormal,
     fontSizeMedium: $fontSizeNormal,
     fontSizeLarge: $fontSizeLarge,
     paddingSmall: '0 12px',
     paddingMedium: '0 16px',
     paddingLarge: '0 24px',
     heightMedium: $heightNormal,
     fontSizeTiny: '14px',
     paddingTiny: '0 8px'
   },
   Dropdown: {
     fontSizeSmall: $fontSizeNormal,
     fontSizeMedium: $fontSizeNormal,
     fontSizeLarge: $fontSizeLarge,
     optionHeightMedium: $heightNormal
   },
   Input: {
     heightMedium: $heightNormal,
     heightLarge: $heightLarge
   },
   Skeleton: {
     borderRadius: $borderRadius,
     heightSmall: '16px',
     heightMedium: '26px'
   },
   Radio: {
     radioSizeMedium: $fontSizeLarge,
     buttonHeightMedium: $heightNormal,
     buttonHeightLarge: $heightLarge
   },
   Tooltip: {
     padding: '10px',
     borderRadius: $borderRadius
   },
   Tag: {
     heightMedium: $heightNormal,
     padding: '0 16px'
   },
   Tabs: {
     tabPaddingMediumLine: '10px 14px',
     tabPaddingMediumBar: '10px 14px',
     tabGapMediumLine: 0
   },
   Popover: {
     padding: '10px'
   },
   Slider: {
     railHeight: $railHeight,
     railWidthVertical: $railHeight
   },
   Transfer: {
     borderRadius: '2px'
   },
   Notification: {
     closeIconSize: '14px'
   },
   Space: {
     gapMedium: '10px'
   },
   Avatar: {
     heightSmall: '14px',
     heightMedium: '28px',
     heightLarge: '40px'
   },
   Calendar: {
     borderRadius: '8px'
   },
   Alert: {
     padding: '15px'
   },
   Anchor: {
     railWidth: '2px'
   },
   Card: {
     paddingMedium: '16px'
   },
   Drawer: {
     bodyPadding: '16px',
     headerPadding: '16px',
     footerPadding: '16px'
   },
   DataTable: {
     thFontWeight: '800'
   },
   Menu: {
     itemHeight: '40px',
     fontSize: '14px'
   }
 }
 
 // 浅主题
 export const mxLightOverrides = {}
 
 // 深主题
 export const mxDarkThemeOverrides = {}
 