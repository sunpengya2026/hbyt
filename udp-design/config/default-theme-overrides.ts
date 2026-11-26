import { GlobalThemeOverrides } from 'naive-ui'
import { addColorAlpha, mixColor, mergeTheme } from 'udp/utils/color'
import { commonThemeOverrides } from './naiveui-component-overrides'
const textColor1 = '#999'
const textColor2 = '#333'
// 浅色主题
export const mxLightTheme = (theme: string): GlobalThemeOverrides => {
  const alphaTheme = addColorAlpha(theme, 0.1)
  const ligth = {
    common: {
      textColor1,
      textColor2,
      borderColor: '#DDDDDD'
    },
    Button: {
      opacityDisabled: '.6',
      colorPressedPrimary: mixColor(theme, '#000000', 0.2)
    },
    Layout: {
      color: '#F4F6F8',
      headerColor: theme,
      siderColor: '#F4F6F8',
      siderToggleButtonIconColor: textColor1
    },
    Menu: {
      itemColorHover: alphaTheme,
      itemTextColorHover: textColor2,
      itemTextColorActive: theme,
      itemIconColor: textColor2,
      itemIconColorHover: textColor2,
      itemIconColorActive: theme,
      arrowColorHover: textColor1,
      arrowColorActive: textColor1,
      arrowColorChildActive: textColor1,
      itemIconColorHoverHorizontal: '#fff',
      itemIconColorActiveHorizontal: '#fff',
      itemIconColorActiveHoverHorizontal: '#fff',
      itemIconColorChildActiveHorizontal: '#fff',
      itemIconColorChildActiveHoverHorizontal: '#fff'
    },
    Dropdown: {
      optionColorHover: alphaTheme,
      optionOpacityDisabled: '.5'
    },
    Spin: {
      opacitySpinning: '.3'
    },
    Skeleton: {
      color: '#FFF2F2F2'
    },
    Tooltip: {
      color: '#FFF',
      textColor: '#333'
    },
    Transfer: {
      borderColor: '#DDDDDD',
      headerColor: mixColor(theme, '#FFFFFF', 0.6),
      titleTextColor: '#333'
    },
    Avatar: {
      color: '#fff'
    },
    Calendar: {
      cellColorHover: theme
    },
    Form: {
      labelTextColor: '#333333FF'
    },
    DataTable: {
      thTextColor: '#333',
      thColor: '#F2F2F2'
    },
    Input: {
      boxShadowFocus: 'none',
      boxShadowFocusWarning: 'none',
      boxShadowFocusError: 'none'
    },
    Checkbox: {
      boxShadowFocus: 'none'
    },
    Radio: {
      boxShadowFocus: 'inset 0 0 0 1px #18a058, 0 0 0 2px transparent',
      buttonBoxShadowFocus: 'none'
    },
    Switch: {
      boxShadowFocus: 'none'
    }
  }
  return mergeTheme(ligth, commonThemeOverrides)
}

// 深色主题
export const mxDarkTheme = (theme: string): GlobalThemeOverrides => {
  const dark = {
    common: {},
    Menu: {
      itemTextColor: '#fff',
      itemTextColorHover: '#fff',
      itemTextColorActive: '#fff',
      itemIconColor: '#fff',
      itemIconColorHover: '#fff',
      itemIconColorActive: '#fff',
      arrowColorHover: '#fff',
      arrowColorActive: '#fff',
      arrowColorChildActive: '#fff'
    }
  }
  return mergeTheme(dark, commonThemeOverrides)
}
