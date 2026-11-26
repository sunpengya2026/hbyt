import { GlobalThemeOverrides } from 'naive-ui'
import { addColorAlpha, getColorPalette } from 'udp/utils/color'
const textColor = '#252525'

export default (theme: string): GlobalThemeOverrides => {
  const alphaTheme = addColorAlpha(theme, 0.1)
  return {
    common: {
      heightMedium: '28px',
      heightLarge: '32px',
      borderRadius: '2px',
      fontSize: '12px',
      fontSizeSmall: '12px',
      fontSizeMedium: '12px',
      fontSizeLarge: '14px',
      textColorBase: textColor,
      infoColor: theme,
      infoColorHover: addColorAlpha(theme, 0.9),
      infoColorPressed: getColorPalette(theme, 6.3),
      infoColorSuppl: theme,
      successColor: '#79D82E',
      successColorHover: addColorAlpha('#79D82E', 0.9),
      successColorPressed: getColorPalette('#79D82E', 6.3),
      successColorSuppl: '#79D82E',
      warningColor: '#FFA307',
      warningColorHover: addColorAlpha('#FFA307', 0.9),
      warningColorPressed: getColorPalette('#FFA307', 6.3),
      warningColorSuppl: '#FFA307',
      errorColor: '#FF4D4F',
      errorColorHover: addColorAlpha('#FF4D4F', 0.9),
      errorColorPressed: getColorPalette('#FF4D4F', 6.3),
      errorColorSuppl: '#FF4D4F'
    },
    Layout: {
      color: '#F4F6F8',
      siderColor: '#F4F6F8'
    },
    Menu: {
      itemHeight: '36px',
      fontSize: '12px',
      itemColorHover: alphaTheme,
      itemTextColorHover: theme,
      itemTextColorActive: theme,
      itemIconColor: textColor,
      itemIconColorHover: theme,
      itemIconColorActive: theme,
      arrowColorHover: theme,
      arrowColorActive: theme,
      arrowColorChildActive: theme,
      itemIconColorHoverHorizontal: '#fff',
      itemIconColorActiveHorizontal: '#fff',
      itemIconColorActiveHoverHorizontal: '#fff',
      itemIconColorChildActiveHorizontal: '#fff',
      itemIconColorChildActiveHoverHorizontal: '#fff'
    },
    Button: {
      borderRadiusTiny: '2px',
      borderRadiusSmall: '2px',
      borderRadiusMedium: '2px',
      borderRadiusLarge: '2px',
      heightTiny: '24px',
      fontSizeSmall: '12px',
      iconSizeSmall: '16px',
      paddingSmall: '0 18px'
    },
    Collapse: {
      titleFontSize: '12px',
      titleFontWeight: '400',
      dividerColor: 'rgba(243, 245, 248, 1)',
      fontSize: '12px',
      textColor: textColor
    },
    Dropdown: {
      padding: '4px 0',
      optionIconSizeSmall: '12px',
      optionIconSizeMedium: '14px',
      optionIconSizeLarge: '16px',
      optionIconSizeHuge: '18px',
      borderRadius: '2px',
      optionTextColor: textColor,
      optionTextColorActive: theme,
      optionTextColorChildActive: theme,
      optionColorHoverInverted: theme,
      optionColorActiveInverted: theme,
      optionColorHover: alphaTheme,
      optionTextColorHover: theme
    },
    Tag: {
      closeIconSizeMedium: '12px',
      closeSizeMedium: '12px',
      padding: '0 8px',
      heightMedium: '22px',
      borderRadius: '2px',
      fontSizeMedium: '12px',
      borderInfo: '1px solid rgba(172,206,255,1)',
      colorInfo: 'rgba(239, 246, 255, 1)',
      colorBorderedInfo: 'rgba(239, 246, 255, 1)',
      closeColorHoverInfo: 'rgba(239, 246, 255, 1)',
      closeColorPressedInfo: 'rgba(239, 246, 255, 1)'
    },
    ColorPicker: {
      borderRadius: '2px',
      panelFontSize: '12px',
      fontSizeSmall: '12px',
      fontSizeMedium: '14px',
      fontSizeLarge: '14px'
    },
    Checkbox: {
      fontSizeSmall: '12px',
      fontSizeMedium: '12px',
      sizeSmall: '16px',
      colorDisabled: 'rgb(250, 250, 252)',
      border: '1px solid rgba(0,0,0,0.15)',
      borderDisabledChecked: '1px solid rgba(0,0,0,0.15)',
      checkMarkColorDisabled: 'rgba(194, 194, 194, 1)',
      borderDisabled: '1px solid rgba(0,0,0,0.15);',
      color: '#FFF'
    },
    DatePicker: {
      itemFontSize: '12px',
      calendarDaysFontSize: '12px',
      calendarTitleFontSize: '12px'
    },
    Calendar: {
      titleFontSize: '14px',
      borderRadius: '2px',
      fontSize: '12px'
    },
    Form: {
      labelFontSizeLeftMedium: '12px',
      labelFontSizeTopMedium: '12px',
      feedbackFontSizeMedium: '12px',
      feedbackHeightMedium: '16px',
      labelHeightMedium: '22px'
    },
    Input: {
      fontSizeMedium: '12px',
      borderRadius: '2px',
      iconSize: '12px',
      clearSize: '12px'
    },
    Radio: {
      fontSizeMedium: '12px',
      colorDisabled: 'rgb(250, 250, 252)',
      textColorDisabled: '#C4C4C4FF',
      labelFontWeight: '400'
    },
    TimePicker: {
      itemFontSize: '12px',
      itemTextColor: ' #5B5B5BFF',
      borderRadius: '2px'
    },
    Transfer: {
      borderRadius: '2px',
      titleFontWeight: '400',
      itemTextColor: '#5B5B5BFF',
      listColor: '#fff'
    },
    DataTable: {
      paginationMargin: '10px 0 0 0',
      thPaddingMedium: '10px',
      tdPaddingMedium: '10px',
      thPaddingSmall: '6px',
      tdPaddingSmall: '6px',
      fontSizeMedium: '12px',
      fontSizeSmall: '12px',
      thColor: 'rgba(243, 245, 248, 1)',
      thColorHover: 'rgba(243, 245, 248, 1)',
      thColorSorting: 'rgba(243, 245, 248, 1)',
      tdColorHover: 'rgba(243, 245, 248, 1)',
      tdColorSorting: 'rgba(243, 245, 248, 1)'
    },
    Table: {
      thPaddingMedium: '10px',
      tdPaddingMedium: '10px',
      thPaddingSmall: '6px',
      tdPaddingSmall: '6px',
      fontSizeMedium: '12px',
      fontSizeSmall: '12px',
      thColor: 'rgba(243, 245, 248, 1)',
      thColorHover: 'rgba(243, 245, 248, 1)',
      thColorSorting: 'rgba(243, 245, 248, 1)',
      tdColorHover: 'rgba(243, 245, 248, 1)',
      tdColorSorting: 'rgba(243, 245, 248, 1)'
    },
    Alert: {
      background: '#FFFFFF',
      'box-shadow': '0px 4px 12px 0px rgba(0,0,0,0.15)',
      'border-radius': '2px',
      borderRadius: '2px',
      fontSize: '12px',
      lineHeight: '12px',
      border: '0',
      iconSize: '14px',
      color: 'rgb(250, 250, 252)',
      closeBorderRadius: '0'
    },
    Dialog: {
      titleFontSize: '14px',
      iconSize: '16px',
      fontSize: '12px',
      borderRadius: '2px',
      titleFontWeight: '500',
      color: '#FFFFFFFF',
      border: 'none'
    },
    Drawer: {
      titleFontSize: '16px',
      boxShadow: '0px 4px 12px 0px ',
      lineHeight: '14px'
    },
    Message: {
      padding: '10px 16px',
      fontSize: '12px',
      iconMargin: '0 8px 0 0 ',
      iconSize: '16px',
      textColor: 'rgba(37, 37, 37, 1)',
      iconColorInfo: theme
    },
    Notification: {
      borderRadius: '2',
      titleFontSize: '14px',
      textColor: 'rgba(91, 91, 91, 1)',
      fontSize: '12px',
      headerTextColor: 'rgba(37, 37, 37, 1)',
      padding: '16px 16px 12px 16px'
    },
    Popconfirm: {
      iconSize: '14px',
      fontSize: '12px'
    },
    Popover: {
      fontSize: '12px'
    },
    Tooltip: {
      color: 'rgba(255, 255, 255, 1)',
      textColor: '#5B5B5BFF'
    },
    Statistic: {
      labelFontSize: '14px',
      valueFontWeight: '500'
    },
    Timeline: {
      contentFontSize: '12px',
      titleFontWeight: '400',
      titleFontSizeMedium: '12px',
      titleFontSizeLarge: '14px',
      iconSizeLarge: '12px',
      circleBorderSuccess: '2px solid #52C41A',
      iconSizeMedium: '10px'
    },
    TreeSelect: {
      menuColor: '#FFFFFFFF',
      menuPadding: '3px'
    },
    Tree: {
      loadingColor: theme,
      dropMarkColor: theme,
      lineColor: 'rgba(189, 189, 214, 1)'
    },
    List: {
      textColor: '#252525FF'
    },
    Cascader: {
      menuBorderRadius: '2px',
      menuDividerColor: 'rgb(239, 239, 245)',
      optionHeight: '28px',
      optionFontSize: '12px',
      optionTextColorDisabled: '#C4C4C4FF'
    },
    Switch: {
      railBorderRadiusSmall: '2px',
      railBorderRadiusMedium: '2px',
      railBorderRadiusLarge: '2px',
      buttonBorderRadiusSmall: '2px',
      buttonBorderRadiusMedium: '2px',
      buttonBorderRadiusLarge: '2px'
    },
    Slider: {
      handleSize: '14px',
      fontSize: '12px',
      markFontSize: '12px',
      indicatorBorderRadius: '2px'
    },
    Tabs: {
      tabFontSizeSmall: '12px',
      tabFontSizeMedium: '12px',
      tabFontSizeLarge: '12px',
      tabColor: 'rgb(247, 247, 250)',
      fontWeightStrong: '400',
      tabTextColorHoverLine: theme,
      tabTextColorActiveLine: theme,
      tabTextColorActiveBar: theme,
      tabTextColorHoverBar: theme,
      tabTextColorActiveCard: theme,
      barColor: theme
    },
    Badge: {
      fontSize: '14px',
      fontFamily: 'PingFangSC-Regular'
    },
    Pagination: {
      itemBorderRadius: '2px',
      itemSizeMedium: '24px',
      itemSizeSmall: '24px',
      itemSizeLarge: '24px',
      itemFontSizeMedium: '12px',
      itemFontSizeLarge: '12px',
      jumperFontSizeMedium: '12px',
      jumperFontSizeLarge: '12px',
      selectWidthSmall: '84px',
      inputWidthSmall: '24px',
      selectWidthMedium: '84px',
      inputWidthLarge: '24px',
      selectWidthLarge: '84px',
      inputWidthMedium: '24px',
      buttonBorder: '0',
      buttonBorderHover: '0',
      buttonBorderPressed: '0',
      itemBorder: '0',
      itemBorderHover: '0',
      itemBorderPressed: '0',
      itemBorderDisabled: '0',
      jumperTextColorDisabled: 'rgba(255, 255, 255, 0)',
      itemColorDisabled: 'rgba(250, 250, 252, 0)',
      itemMarginMedium: '0',
      itemMarginLarge: '0',
      buttonIconSizeMedium: '14px',
      buttonIconSizeLarge: '14px',
      itemMarginSmall: '0'
    },
    Steps: {
      stepHeaderFontSizeMedium: '14px',
      indicatorSizeMedium: '24px',
      indicatorIconSizeMedium: '14px',
      indicatorSizeSmall: '24px',
      indicatorIndexFontSizeMedium: '14px'
    },
    Upload: {
      fontSize: '12px',
      borderRadius: '2px',
      lineHeight: '1'
    }
  }
}
