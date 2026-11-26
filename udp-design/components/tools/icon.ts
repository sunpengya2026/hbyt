import { h, defineComponent, ref, computed, watch } from 'vue'
/* [验收裁剪] 图片/第三方 svg-inject 引用已删除
import SVGInjectInstance from '@iconfu/svg-inject'
import mxLoadFail from '../../assets/icons/mx-load-fail.svg'
const mxModule = import.meta.glob('../../assets/icons/**/**.svg')
const module = import.meta.glob('../../../src/assets/icons/**/**.svg')
const iconPath = 'http://11.11.154.117:7001'
*/
const SVGInjectInstance: any = null
const mxLoadFail = ''
const mxModule: Record<string, any> = {}
const module: Record<string, any> = {}
const iconPath = ''

export default defineComponent({
  name: 'Icon',
  props: {
    src: {
      required: true,
      type: String
    },
    isMxdir: {
      type: Boolean,
      default: false
    },
    isWatch: {
      type: Boolean,
      default: false
    },
    style: {
      type: Object,
      default: () => {}
    }
  },
  setup(props) {
    const IconNode = ref()
    const icon = computed(() => props.src)
    const isMxDesignDir = computed(() => props.isMxdir)

    const renderIcon = () => {
      if (icon.value === 'none' || !icon.value) {
        IconNode.value = null
      } else {
        if (icon.value.indexOf('base64') !== -1) {
          IconNode.value = h('i', { class: 'anticon', key: icon.value }, [
            h('img', {
              src: icon.value,
              style: {
                width: '1em',
                height: '1em',
                verticalAlign: 'initial',
                ...props.style
              },
              onerror: () => {
                IconNode.value = h('i', { class: 'anticon' }, [
                  h(mxLoadFail, {
                    style: {
                      width: '1em',
                      height: '1em',
                      ...props.style
                    }
                  })
                ])
              }
            })
          ])
        } else if (icon.value.indexOf('self-') === 0) {
          try {
            const svgModule = isMxDesignDir.value
              ? mxModule[`../../assets/icons/${icon.value.replace('self-', '')}.svg`]
              : module[`../../../src/assets/icons/${icon.value.replace('self-', '')}.svg`]
            svgModule().then(mod => {
              IconNode.value = h('i', { class: 'anticon', key: icon.value }, [
                h(mod.default, {
                  style: {
                    width: '1em',
                    height: '1em',
                    ...props.style
                  }
                })
              ])
            })
          } catch (error) {
            IconNode.value = h('i', { class: 'anticon' }, [
              h(mxLoadFail, {
                style: {
                  width: '1em',
                  height: '1em',
                  ...props.style
                }
              })
            ])
          }
        } else if (icon.value.indexOf(`${iconPath}/kld-icon`) === 0) {
          IconNode.value = h('i', { class: 'anticon', key: icon.value }, [
            h('img', {
              style: {
                width: '1em',
                height: '1em',
                ...props.style
              },
              src: icon.value.slice(iconPath.length),
              onload: (e: Event) => {
                SVGInjectInstance(e.target, {
                  copyAttributes: false
                })
              },
              onerror: () => {
                IconNode.value = h('i', { class: 'anticon' }, [
                  h(mxLoadFail, {
                    style: {
                      width: '1em',
                      height: '1em',
                      ...props.style
                    }
                  })
                ])
              }
            })
          ])
        } else if (/^(epai-|fa-rwp-)([\w.]+\/?)\S*/.test(icon.value)) {
          IconNode.value = h('i', { class: 'anticon', key: icon.value }, [
            h('img', {
              style: {
                width: '1em',
                height: '1em',
                fill: 'currentColor',
                ...props.style
              },
              src: `/rfIcons/npmIcons/${icon.value}.svg`,
              onload: (e: Event) => {
                SVGInjectInstance(e.target)
              },
              onerror: () => {
                IconNode.value = h('i', { class: 'anticon' }, [
                  h(mxLoadFail, {
                    style: {
                      width: '1em',
                      height: '1em',
                      ...props.style
                    }
                  })
                ])
              }
            })
          ])
        } else if (/^(http|https):\/\/([\w.]+\/?)\S*/.test(icon.value)) {
          IconNode.value = h('i', { class: 'anticon', key: icon.value }, [
            h('img', {
              style: {
                width: '1em',
                height: '1em',
                fill: 'currentColor',
                ...props.style
              },
              src: icon.value,
              onerror: () => {
                IconNode.value = h('i', { class: 'anticon' }, [
                  h(mxLoadFail, {
                    style: {
                      width: '1em',
                      height: '1em',
                      ...props.style
                    }
                  })
                ])
              }
            })
          ])
        } else {
          const isSvg = icon.value.endsWith('.svg')
          IconNode.value = h('i', { class: 'anticon', key: icon.value }, [
            h('img', {
              style: {
                width: '1em',
                height: '1em',
                ... isSvg ? { fill: 'currentColor' } : { verticalAlign: 'initial' },
                ...props.style
              },
              src: icon.value,
              onload: (e: Event) => {
                if (isSvg) {
                  SVGInjectInstance(e.target)
                }
              },
              onerror: () => {
                IconNode.value = h('i', { class: 'anticon' }, [
                  h(mxLoadFail, {
                    style: {
                      width: '1em',
                      height: '1em',
                      ...props.style
                    }
                  })
                ])
              }
            })
          ])
        }
      }
    }

    if (props.isWatch) {
      watch(icon, renderIcon, { immediate: true })
    } else {
      renderIcon()
    }
    return {
      IconNode
    }
  },
  render() {
    return this.IconNode
  }
})
