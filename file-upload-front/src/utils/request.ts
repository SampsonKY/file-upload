interface RequestOptions {
  url: string;
  method: 'post' | 'get';
  data?: FormData | string;
  headers?: object;
  onProgress?: (e: ProgressEvent<EventTarget>) => unknown;
  xhrList?: unknown[];
  callback?: (args: any) => void;
}

function request(options: RequestOptions) {
  const { url, method, data, headers = {}, onProgress = (e) => e, xhrList, callback } = options;
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = onProgress; // 数据传输进行中
    xhr.open(method, url);
    Object.keys(headers).forEach((key) => {
      xhr.setRequestHeader(key, headers[key]);
    });
    xhr.send(data);
    xhr.onload = (e) => {
      // 将请求成功的 xhr 从列表中删除
      if (xhrList && callback) {
        const xhrIndex = xhrList.findIndex((item) => item === xhr);
        xhrList.splice(xhrIndex, 1);
        callback(xhrList);
      }
      resolve({
        data: (e.target as any).response,
      });
    };

    // 暴露当前 xhr 给外部
    if (callback && xhrList) {
      xhrList.push(xhr);
      callback(xhrList);
    }
  });
}

export default request;
