/* [安全清理-中风险] 默认硬编码 AES 密钥已禁用
import CryptoJS from 'crypto-js'
*/
/**
 * @word 要加密的内容
 * @keyWord String  服务器随机返回的关键字
 *  */
/* [安全清理-中风险]
export function aesEncrypt(word,keyWord="XwKsGlMcdPMEhR1B"){
  var key = CryptoJS.enc.Utf8.parse(keyWord);
  var srcs = CryptoJS.enc.Utf8.parse(word);
  var encrypted = CryptoJS.AES.encrypt(srcs, key, {mode:CryptoJS.mode.ECB,padding: CryptoJS.pad.Pkcs7});
  return encrypted.toString();
}
*/
// 安全清理后占位：不再使用本地默认密钥加密
export function aesEncrypt(word, keyWord) {
	return ''
}
