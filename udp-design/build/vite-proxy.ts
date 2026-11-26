// 统一处理proxy
export function createProxy(config: Record<string, any>) {
  const proxyList: Record<string, object> = {}
  for (const key in config) {
    proxyList[key] = {
      target: config[key],
      secure: false,
      ws: true,
      changeOrigin: true,
      configure: (proxy, options) => {
        // 添加请求日志以显示真实地址
        proxy.on('proxyReq', (proxyReq, req, res) => {
          console.log(`[Proxy] ${req.method} ${req.url} -> ${options.target}${req.url}`);
        });
        proxy.on('proxyRes', (proxyRes, req, res) => {
          console.log(`[Proxy Response] ${req.method} ${req.url} -> ${options.target}${req.url} [${proxyRes.statusCode}]`);
        });
      }
    }
  }
  return proxyList
}
