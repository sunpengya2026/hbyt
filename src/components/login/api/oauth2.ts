import { $api } from 'udp/utils/service/request'
import { basePrefix, authPrefix} from '@/api/prefix'
// 获得授权信息
export const getAuthorize = (clientId: string) => {
  return $api.get(`${authPrefix}/system/oauth2/authorize?clientId=` + clientId)
}
export const codeChangeToken = (code: string,redirectUri:string) => {
  return $api.post(`${basePrefix}/sso/auth/login-by-code?code=${code}&redirectUri=${redirectUri}`)
}

interface Result {
  code: number
  data: any
  msg: string
}
export const getOauth2User: () => Promise<Result> = () => {
  return $api.get(`${authPrefix}/system/oauth2/user/get`) as Promise<Result>
}


// 第三方用户中心交互token
interface UserInfo {
  id: string;
  username: string;
  nickname: string;
  email: string | null;
  mobile: string | null;
  sex: string | null;
  avatar: string | null;
  orgId: string;
  dataRegion: string;
}

interface TokenContext {
  user: UserInfo;
  username: string;
}

interface TokenData {
  userId: string;
  userType: number;
  tenantId: string;
  clientId: string;
  scopes: null; // 如果未来可能有值，可以定义为 string[] | null
  accessToken: string;
  context: TokenContext;
  expiresTime: string; // 可以使用 Date 类型，但通常保持字符串形式以便解析
}

export interface TokenResponse {
  code: number;
  data: TokenData;
  message: string;
}

export const thirdOauth2AccessToken = (token:string) => {
  return $api.post(`base/auth3/convert-token?jwt=${token}`,{ jwt: token })
}

export const thirdOauthGetUser = () => {
  return $api.get(`${basePrefix}/sso/user/get`)
}
