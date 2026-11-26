import type { App } from 'vue'
import { ActionPermission } from './action-permission'

export function setupDirectives(app: App<Element>) {
  app.directive('action', ActionPermission)
}
