import { h, watchEffect } from 'vue'
import Icon from 'udp/components/tools/icon'
import './table-style.less'

export function useColumns(dataTableRef, columns) {
  const columnsChange = columns => {
    columns?.forEach(v => {
      // 添加拖拽功能
      v.resizable = true
      // 改变排序图标
      if (v.sorter) {
        v.renderSorterIcon = ({ order }) => {
          return h('i', { class: 'sorter-icon' }, [
            h(Icon, {
              src: 'self-mx-up',
              isMxdir: true,
              class: order === 'ascend' ? 'current' : '',
              onClick(e) {
                e.stopPropagation()
                const key = order === 'ascend' ? false : 'ascend'
                dataTableRef.value.sort(v.key, key)
              }
            }),
            h(Icon, {
              src: 'self-mx-down',
              isMxdir: true,
              class: order === 'descend' ? 'current' : '',
              onClick(e) {
                e.stopPropagation()
                const key = order === 'descend' ? false : 'descend'
                dataTableRef.value.sort(v.key, key)
              }
            })
          ])
        }
      }
      // 改变筛选图标
      if (v.filter) {
        v.renderFilterIcon = () => {
          return h(Icon, {
            src: 'self-mx-filter',
            isMxdir: true,
            class: 'filter-icon'
          })
        }
      }

      if (v.children) {
        columnsChange(v.children)
      }
    })
  }

  watchEffect(() => {
    if (dataTableRef.value) {
      // 改变样式
      dataTableRef.value.$el.classList.add('table-style')
      dataTableRef.value.$el.style.setProperty('--n-td-padding', '6px 12px')
      dataTableRef.value.$el.style.setProperty('--n-th-padding', '6px 12px')
      dataTableRef.value.$el.style.setProperty('--n-resizable-container-size', '16px')
    }
    columnsChange(columns.value || columns)
  })
  return columns
}
