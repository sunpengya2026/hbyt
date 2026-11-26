const publicKey = 'udp-platform'

/**
 * 完全同步的加密解密方案
 * 不依赖Web Crypto API，支持HTTP和HTTPS环境
 * 使用AES加密算法 + Base64编码
 */



// 使用示例
// // 导入加密函数
// import { encryptData, decryptData } from './crypt.js';

// // 加密（同步）
// const encrypted = encryptData('hello world', 'your-key');
// console.log('加密结果:', encrypted);

// // 解密（同步）
// const decrypted = decryptData(encrypted, 'your-key');
// console.log('解密结果:', decrypted);

// // URL参数加密示例
// const originalData = JSON.stringify({
//     token: 'your-token-value',
//     tenantId: 'your-tenant-id'
// });

// const encrypted = encryptData(originalData, 'your-key');
// const urlSafeEncrypted = encodeURIComponent(encrypted);
// const url = `https://example.com/target-page?data=${urlSafeEncrypted}`;



/**
 * AES加密算法实现
 * 基于JavaScript实现的AES-128-CBC加密
 */

// AES S-Box
const SBOX = [
    0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76,
    0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0,
    0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7, 0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15,
    0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75,
    0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84,
    0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf,
    0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85, 0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8,
    0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5, 0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2,
    0xcd, 0x0c, 0x13, 0xec, 0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73,
    0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14, 0xde, 0x5e, 0x0b, 0xdb,
    0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c, 0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79,
    0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5, 0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08,
    0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a,
    0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e,
    0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf,
    0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16
];

// AES逆S-Box
const INV_SBOX = [
    0x52, 0x09, 0x6a, 0xd5, 0x30, 0x36, 0xa5, 0x38, 0xbf, 0x40, 0xa3, 0x9e, 0x81, 0xf3, 0xd7, 0xfb,
    0x7c, 0xe3, 0x39, 0x82, 0x9b, 0x2f, 0xff, 0x87, 0x34, 0x8e, 0x43, 0x44, 0xc4, 0xde, 0xe9, 0xcb,
    0x54, 0x7b, 0x94, 0x32, 0xa6, 0xc2, 0x23, 0x3d, 0xee, 0x4c, 0x95, 0x0b, 0x42, 0xfa, 0xc3, 0x4e,
    0x08, 0x2e, 0xa1, 0x66, 0x28, 0xd9, 0x24, 0xb2, 0x76, 0x5b, 0xa2, 0x49, 0x6d, 0x8b, 0xd1, 0x25,
    0x72, 0xf8, 0xf6, 0x64, 0x86, 0x68, 0x98, 0x16, 0xd4, 0xa4, 0x5c, 0xcc, 0x5d, 0x65, 0xb6, 0x92,
    0x6c, 0x70, 0x48, 0x50, 0xfd, 0xed, 0xb9, 0xda, 0x5e, 0x15, 0x46, 0x57, 0xa7, 0x8d, 0x9d, 0x84,
    0x90, 0xd8, 0xab, 0x00, 0x8c, 0xbc, 0xd3, 0x0a, 0xf7, 0xe4, 0x58, 0x05, 0xb8, 0xb3, 0x45, 0x06,
    0xd0, 0x2c, 0x1e, 0x8f, 0xca, 0x3f, 0x0f, 0x02, 0xc1, 0xaf, 0xbd, 0x03, 0x01, 0x13, 0x8a, 0x6b,
    0x3a, 0x91, 0x11, 0x41, 0x4f, 0x67, 0xdc, 0xea, 0x97, 0xf2, 0xcf, 0xce, 0xf0, 0xb4, 0xe6, 0x73,
    0x96, 0xac, 0x74, 0x22, 0xe7, 0xad, 0x35, 0x85, 0xe2, 0xf9, 0x37, 0xe8, 0x1c, 0x75, 0xdf, 0x6e,
    0x47, 0xf1, 0x1a, 0x71, 0x1d, 0x29, 0xc5, 0x89, 0x6f, 0xb7, 0x62, 0x0e, 0xaa, 0x18, 0xbe, 0x1b,
    0xfc, 0x56, 0x3e, 0x4b, 0xc6, 0xd2, 0x79, 0x20, 0x9a, 0xdb, 0xc0, 0xfe, 0x78, 0xcd, 0x5a, 0xf4,
    0x1f, 0xdd, 0xa8, 0x33, 0x88, 0x07, 0xc7, 0x31, 0xb1, 0x12, 0x10, 0x59, 0x27, 0x80, 0xec, 0x5f,
    0x60, 0x51, 0x7f, 0xa9, 0x19, 0xb5, 0x4a, 0x0d, 0x2d, 0xe5, 0x7a, 0x9f, 0x93, 0xc9, 0x9c, 0xef,
    0xa0, 0xe0, 0x3b, 0x4d, 0xae, 0x2a, 0xf5, 0xb0, 0xc8, 0xeb, 0xbb, 0x3c, 0x83, 0x53, 0x99, 0x61,
    0x17, 0x2b, 0x04, 0x7e, 0xba, 0x77, 0xd6, 0x26, 0xe1, 0x69, 0x14, 0x63, 0x55, 0x21, 0x0c, 0x7d
];

// 轮常量
const RCON = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36];

/**
 * 生成密钥
 * @param {string} password 密码
 * @returns {Uint8Array} 16字节密钥
 */
function generateKey(password) {
    const encoder = new TextEncoder();
    const keyBytes = encoder.encode(password);
    const hash = new Array(16).fill(0);
    
    for (let i = 0; i < 16; i++) {
        hash[i] = keyBytes[i % keyBytes.length] ^ (i * 7);
    }
    
    return new Uint8Array(hash);
}

/**
 * 生成IV
 * @param {string} password 密码
 * @returns {Uint8Array} 16字节IV
 */
function generateIV(password) {
    const encoder = new TextEncoder();
    const keyBytes = encoder.encode(password);
    const iv = new Array(16).fill(0);
    
    for (let i = 0; i < 16; i++) {
        iv[i] = keyBytes[(i + 5) % keyBytes.length] ^ (i * 11);
    }
    
    return new Uint8Array(iv);
}

/**
 * 字节数组转字数组
 * @param {Uint8Array} bytes 字节数组
 * @returns {Uint32Array} 字数组
 */
function bytesToWords(bytes) {
    const words = new Uint32Array(4);
    for (let i = 0; i < 4; i++) {
        words[i] = (bytes[i * 4] << 24) | (bytes[i * 4 + 1] << 16) | (bytes[i * 4 + 2] << 8) | bytes[i * 4 + 3];
    }
    return words;
}

/**
 * 字数组转字节数组
 * @param {Uint32Array} words 字数组
 * @returns {Uint8Array} 字节数组
 */
function wordsToBytes(words) {
    const bytes = new Uint8Array(16);
    for (let i = 0; i < 4; i++) {
        bytes[i * 4] = (words[i] >>> 24) & 0xff;
        bytes[i * 4 + 1] = (words[i] >>> 16) & 0xff;
        bytes[i * 4 + 2] = (words[i] >>> 8) & 0xff;
        bytes[i * 4 + 3] = words[i] & 0xff;
    }
    return bytes;
}

/**
 * 密钥扩展
 * @param {Uint8Array} key 原始密钥
 * @returns {Array<Uint8Array>} 扩展密钥
 */
function keyExpansion(key) {
    const keys = [];
    keys.push(key);
    
    for (let round = 1; round <= 10; round++) {
        const prevKey = keys[round - 1];
        const newKey = new Uint8Array(16);
        
        // 轮密钥生成
        for (let i = 0; i < 4; i++) {
            const col = i * 4;
            if (i === 0) {
                // 第一列特殊处理
                const temp = [prevKey[col + 1], prevKey[col + 2], prevKey[col + 3], prevKey[col]];
                for (let j = 0; j < 4; j++) {
                    temp[j] = SBOX[temp[j]];
                }
                temp[0] ^= RCON[round - 1];
                
                for (let j = 0; j < 4; j++) {
                    newKey[col + j] = prevKey[col + j] ^ temp[j];
                }
            } else {
                for (let j = 0; j < 4; j++) {
                    newKey[col + j] = prevKey[col + j] ^ newKey[(i - 1) * 4 + j];
                }
            }
        }
        keys.push(newKey);
    }
    
    return keys;
}

/**
 * SubBytes变换
 * @param {Uint8Array} state 状态数组
 */
function subBytes(state) {
    for (let i = 0; i < 16; i++) {
        state[i] = SBOX[state[i]];
    }
}

/**
 * 逆SubBytes变换
 * @param {Uint8Array} state 状态数组
 */
function invSubBytes(state) {
    for (let i = 0; i < 16; i++) {
        state[i] = INV_SBOX[state[i]];
    }
}

/**
 * ShiftRows变换
 * @param {Uint8Array} state 状态数组
 */
function shiftRows(state) {
    const temp = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
        temp[i] = state[i];
    }
    
    // 第二行左移1位
    state[1] = temp[5];
    state[5] = temp[9];
    state[9] = temp[13];
    state[13] = temp[1];
    
    // 第三行左移2位
    state[2] = temp[10];
    state[6] = temp[14];
    state[10] = temp[2];
    state[14] = temp[6];
    
    // 第四行左移3位
    state[3] = temp[15];
    state[7] = temp[3];
    state[11] = temp[7];
    state[15] = temp[11];
}

/**
 * 逆ShiftRows变换
 * @param {Uint8Array} state 状态数组
 */
function invShiftRows(state) {
    const temp = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
        temp[i] = state[i];
    }
    
    // 第二行右移1位
    state[1] = temp[13];
    state[5] = temp[1];
    state[9] = temp[5];
    state[13] = temp[9];
    
    // 第三行右移2位
    state[2] = temp[10];
    state[6] = temp[14];
    state[10] = temp[2];
    state[14] = temp[6];
    
    // 第四行右移3位
    state[3] = temp[7];
    state[7] = temp[11];
    state[11] = temp[15];
    state[15] = temp[3];
}

/**
 * MixColumns变换
 * @param {Uint8Array} state 状态数组
 */
function mixColumns(state) {
    for (let i = 0; i < 4; i++) {
        const col = i * 4;
        const s0 = state[col];
        const s1 = state[col + 1];
        const s2 = state[col + 2];
        const s3 = state[col + 3];
        
        state[col] = gmul(0x02, s0) ^ gmul(0x03, s1) ^ s2 ^ s3;
        state[col + 1] = s0 ^ gmul(0x02, s1) ^ gmul(0x03, s2) ^ s3;
        state[col + 2] = s0 ^ s1 ^ gmul(0x02, s2) ^ gmul(0x03, s3);
        state[col + 3] = gmul(0x03, s0) ^ s1 ^ s2 ^ gmul(0x02, s3);
    }
}

/**
 * 逆MixColumns变换
 * @param {Uint8Array} state 状态数组
 */
function invMixColumns(state) {
    for (let i = 0; i < 4; i++) {
        const col = i * 4;
        const s0 = state[col];
        const s1 = state[col + 1];
        const s2 = state[col + 2];
        const s3 = state[col + 3];
        
        state[col] = gmul(0x0e, s0) ^ gmul(0x0b, s1) ^ gmul(0x0d, s2) ^ gmul(0x09, s3);
        state[col + 1] = gmul(0x09, s0) ^ gmul(0x0e, s1) ^ gmul(0x0b, s2) ^ gmul(0x0d, s3);
        state[col + 2] = gmul(0x0d, s0) ^ gmul(0x09, s1) ^ gmul(0x0e, s2) ^ gmul(0x0b, s3);
        state[col + 3] = gmul(0x0b, s0) ^ gmul(0x0d, s1) ^ gmul(0x09, s2) ^ gmul(0x0e, s3);
    }
}

/**
 * GF(2^8)乘法
 * @param {number} a 第一个数
 * @param {number} b 第二个数
 * @returns {number} 结果
 */
function gmul(a, b) {
    let result = 0;
    for (let i = 0; i < 8; i++) {
        if (b & 1) {
            result ^= a;
        }
        const hiBitSet = a & 0x80;
        a <<= 1;
        if (hiBitSet) {
            a ^= 0x1b;
        }
        b >>= 1;
    }
    return result & 0xff;
}

/**
 * 添加轮密钥
 * @param {Uint8Array} state 状态数组
 * @param {Uint8Array} key 轮密钥
 */
function addRoundKey(state, key) {
    for (let i = 0; i < 16; i++) {
        state[i] ^= key[i];
    }
}

/**
 * AES加密一个块
 * @param {Uint8Array} block 16字节块
 * @param {Array<Uint8Array>} keys 扩展密钥
 * @returns {Uint8Array} 加密后的块
 */
function encryptBlock(block, keys) {
    const state = new Uint8Array(block);
    
    // 初始轮密钥添加
    addRoundKey(state, keys[0]);
    
    // 9轮变换
    for (let round = 1; round < 10; round++) {
        subBytes(state);
        shiftRows(state);
        mixColumns(state);
        addRoundKey(state, keys[round]);
    }
    
    // 最后一轮（无MixColumns）
    subBytes(state);
    shiftRows(state);
    addRoundKey(state, keys[10]);
    
    return state;
}

/**
 * AES解密一个块
 * @param {Uint8Array} block 16字节块
 * @param {Array<Uint8Array>} keys 扩展密钥
 * @returns {Uint8Array} 解密后的块
 */
function decryptBlock(block, keys) {
    const state = new Uint8Array(block);
    
    // 初始轮密钥添加
    addRoundKey(state, keys[10]);
    
    // 9轮变换
    for (let round = 9; round > 0; round--) {
        invShiftRows(state);
        invSubBytes(state);
        addRoundKey(state, keys[round]);
        invMixColumns(state);
    }
    
    // 最后一轮（无InvMixColumns）
    invShiftRows(state);
    invSubBytes(state);
    addRoundKey(state, keys[0]);
    
    return state;
}

/**
 * PKCS7填充
 * @param {Uint8Array} data 数据
 * @param {number} blockSize 块大小
 * @returns {Uint8Array} 填充后的数据
 */
function pkcs7Pad(data, blockSize = 16) {
    const padLength = blockSize - (data.length % blockSize);
    const padded = new Uint8Array(data.length + padLength);
    padded.set(data);
    for (let i = data.length; i < padded.length; i++) {
        padded[i] = padLength;
    }
    return padded;
}

/**
 * PKCS7去填充
 * @param {Uint8Array} data 数据
 * @returns {Uint8Array} 去填充后的数据
 */
function pkcs7Unpad(data) {
    const padLength = data[data.length - 1];
    return data.slice(0, data.length - padLength);
}

/**
 * CBC模式加密
 * @param {Uint8Array} data 数据
 * @param {Uint8Array} key 密钥
 * @param {Uint8Array} iv 初始化向量
 * @returns {Uint8Array} 加密后的数据
 */
function cbcEncrypt(data, key, iv) {
    const keys = keyExpansion(key);
    const padded = pkcs7Pad(data);
    const result = new Uint8Array(padded.length);
    let previousBlock = new Uint8Array(iv);
    
    for (let i = 0; i < padded.length; i += 16) {
        const block = padded.slice(i, i + 16);
        
        // XOR with previous ciphertext block (or IV for first block)
        for (let j = 0; j < 16; j++) {
            block[j] ^= previousBlock[j];
        }
        
        const encryptedBlock = encryptBlock(block, keys);
        result.set(encryptedBlock, i);
        previousBlock = encryptedBlock;
    }
    
    return result;
}

/**
 * CBC模式解密
 * @param {Uint8Array} data 数据
 * @param {Uint8Array} key 密钥
 * @param {Uint8Array} iv 初始化向量
 * @returns {Uint8Array} 解密后的数据
 */
function cbcDecrypt(data, key, iv) {
    const keys = keyExpansion(key);
    const result = new Uint8Array(data.length);
    let previousBlock = new Uint8Array(iv);
    
    for (let i = 0; i < data.length; i += 16) {
        const block = data.slice(i, i + 16);
        const decryptedBlock = decryptBlock(block, keys);
        
        // XOR with previous ciphertext block (or IV for first block)
        for (let j = 0; j < 16; j++) {
            result[i + j] = decryptedBlock[j] ^ previousBlock[j];
        }
        
        previousBlock = block;
    }
    
    return pkcs7Unpad(result);
}

/**
 * 加密数据
 * @param {string} text 要加密的文本
 * @param {string} sharekey 加密密钥，默认使用平台公钥
 * @returns {string} 加密后的Base64编码文本
 */
export function encryptData(text, sharekey = publicKey) {
    try {
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        const key = generateKey(sharekey);
        const iv = generateIV(sharekey);
        
        const encrypted = cbcEncrypt(data, key, iv);
        
        // 将IV和密文拼接
        const result = new Uint8Array(iv.length + encrypted.length);
        result.set(iv, 0);
        result.set(encrypted, iv.length);
        
        // Base64编码
        return btoa(String.fromCharCode(...result));
    } catch (err) {
        console.error('加密失败:', err);
        throw new Error('encryptData: 加密失败');
    }
}

/**
 * 解密数据
 * @param {string} encryptedBase64 加密的Base64编码文本
 * @param {string} sharekey 解密密钥，默认使用平台公钥
 * @returns {string} 解密后的文本
 */
export function decryptData(encryptedBase64, sharekey = publicKey) {
    try {
        // Base64解码
        const binary = atob(encryptedBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        
        // 分离IV和密文
        const iv = bytes.slice(0, 16);
        const encrypted = bytes.slice(16);
        
        const key = generateKey(sharekey);
        const decrypted = cbcDecrypt(encrypted, key, iv);
        
        const decoder = new TextDecoder();
        return decoder.decode(decrypted);
    } catch (err) {
        console.error('解密失败:', err);
        throw new Error('decryptData: 解密失败');
    }
}

export default {
    encryptData,
    decryptData
}

// 使用示例
// // 导入加密函数
// import { encryptData, decryptData } from './crypt.js';

// // 加密（同步）
// const encrypted = encryptData('hello world', 'your-key');
// console.log('加密结果:', encrypted);

// // 解密（同步）
// const decrypted = decryptData(encrypted, 'your-key');
// console.log('解密结果:', decrypted);

// // URL参数加密示例
// const originalData = JSON.stringify({
//     token: 'your-token-value',
//     tenantId: 'your-tenant-id'
// });

// const encrypted = encryptData(originalData, 'your-key');
// const urlSafeEncrypted = encodeURIComponent(encrypted);
// const url = `https://example.com/target-page?data=${urlSafeEncrypted}`;
