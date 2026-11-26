
import { $api } from 'udp/utils/service/request'
import { authPrefix } from '@/api/prefix'
//获取验证图片  以及token
export function reqGet(data) {
    return $api.post(`${authPrefix}/system/captcha/get`, data)
}

//滑动或者点选验证
export function reqCheck(data) {
    return $api.post(`${authPrefix}/system/captcha/check`, data)
}


