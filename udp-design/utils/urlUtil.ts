// 获取 URL 参数（支持 search 和 hash 部分）
export function getUrlParam(url: string, paramName: string): string | null {
  if (!url || !paramName) return null;
  url = decodeURIComponent(url);
  // 优化URL，将第一个"?"之后的其他"?"替换为"&"
  let optimizedUrl = url;
  const firstQuestionIndex = url.indexOf('?');
  if (firstQuestionIndex !== -1) {
    const beforeFirstQuestion = url.substring(0, firstQuestionIndex + 1);
    const afterFirstQuestion = url.substring(firstQuestionIndex + 1);
    // 将第一个"?"之后的所有"?"替换为"&"
    optimizedUrl = beforeFirstQuestion + afterFirstQuestion.replace(/\?/g, '&');
  }

  // 提取 search 部分
  const searchMatch = optimizedUrl.match(/\?([^#]*)/);
  let searchParams: URLSearchParams | null = null;
  if (searchMatch && searchMatch[1]) {
    searchParams = new URLSearchParams(searchMatch[1]);
    if (searchParams.has(paramName)) {
      return decodeURIComponent(searchParams.get(paramName) as string);
    }
  }

  // 提取 hash 部分
  const hashIndex = optimizedUrl.indexOf('#');
  if (hashIndex !== -1) {
    const hash = optimizedUrl.substring(hashIndex + 1);
    // 可能是 #/path?param=xxx 或 #?param=xxx
    const hashQueryIndex = hash.indexOf('?');
    if (hashQueryIndex !== -1) {
      const hashQuery = hash.substring(hashQueryIndex + 1);
      const hashParams = new URLSearchParams(hashQuery);
      if (hashParams.has(paramName)) {
        return decodeURIComponent(hashParams.get(paramName) as string);
      }
    }
  }

  return null;
} 