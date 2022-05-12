import React, { useEffect, useState } from 'react';
import { Button, message, Progress } from 'antd';
import { SIZE } from './utils/constant';
import request from './utils/request';
import './app.less';

const App: React.FC = () => {
  const [file, setFile] = useState<File>();
  const [parts, setParts] = useState([]);
  const [uploadPercentage, setUploadPercentage] = useState(0);
  const [hashPercent, setHashPercent] = useState(0);
  const [hash, setHash] = useState<string>();
  const [xhrList, setXHRList] = useState([]);

  const createProcessHandler = (index) => {
    return (e) => {
      setParts((prev) => {
        prev[index].percentage = parseInt(String((e.loaded / e.total) * 100));
        return [...prev];
      });
    };
  };

  const xhrCallback = (list) => {
    setXHRList(list);
  };

  //? 1.选择文件
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files[0]);
  };

  //? 3.生成文件切片
  const createFileChunk = (size = SIZE) => {
    const fileChunkList: { file: Blob }[] = [];
    let cur = 0;
    while (cur < file.size) {
      fileChunkList.push({ file: file.slice(cur, cur + size) });
      cur += size;
    }
    return fileChunkList;
  };

  //? 4. 增量计算文件hash值
  const calculateHashIdle = (chunks):Promise<string> => {
    return new Promise(resolve => {
      // @ts-ignore
      const spark = new window.SparkMD5.ArrayBuffer();
      let count = 0;
      // 根据文件内容追加计算
      const appendToSpark = async file => {
        return new Promise(resolve => {
          const reader = new FileReader();
          reader.readAsArrayBuffer(file);
          reader.onload = e => {
            spark.append(e.target.result);
            resolve(null);
          }
        })
      };

      const workLoop = async deadline => {
        // 有任务，且当前帧还没结束
        while (count < chunks.length && deadline.timeRemaining() > 1) {
          await appendToSpark(chunks[count].file);
          count++
          if (count < chunks.length) {
            setHashPercent(Number(((100 * count) / chunks.length).toFixed(2)));
          } else {
            setHashPercent(100);
            resolve(spark.end());
          }
          window.requestIdleCallback(workLoop);
        };
      }
      window.requestIdleCallback(workLoop);
    })
  }

  //? 5. 判断文件是否已经上传，根据内容 hash 判断
  const verifyUpload = async (filename, fileHash) => {
    const result: any = await request({
      url: 'http://localhost:3000/verify',
      headers: {
        'content-type': 'application/json',
      },
      method: 'post',
      data: JSON.stringify({
        filename,
        fileHash,
      }),
    });
    return JSON.parse(result.data);
  };

  //? 6.上传切片
  const uploadChunks = async (chunks, fileHash, uploadedList = []) => {
    const requestList = chunks
      .filter((part) => !uploadedList.includes(part.hash))
      .map((part) => {
        const { chunk, index } = part;
        const formData = new FormData();
        formData.append('chunk', chunk);
        formData.append('hash', part.hash);
        formData.append('fileHash', fileHash);
        formData.append('filename', file.name);
        return { formData, index };
      })
      .map(async ({ formData, index }) => {
        return await request({
          url: 'http://localhost:3000/',
          method: 'post',
          data: formData,
          onProgress: createProcessHandler(index),
          xhrList,
          callback: xhrCallback,
        });
      });

    await Promise.all(requestList); // 并发上传

    // 之前的切片数 + 本次上传切片数 = 所有切片数时
    // 合并切片
    if (uploadedList.length + requestList.length === chunks.length) {
      await mergeRequest(fileHash);
    }
  };

  //? 7.发送切片合并请求
  const mergeRequest = async (fileHash) => {
    await request({
      url: 'http://localhost:3000/merge',
      headers: {
        'content-type': 'application/json',
      },
      data: JSON.stringify({
        filename: file.name,
        fileHash,
        size: SIZE,
      }),
      method: 'post',
    });
  };

  //? 2. 点击文件上传按钮
  const handleUpload = async () => {
    if (!file) return;
    const fileChunkList = createFileChunk();
    const fileHash = await calculateHashIdle(fileChunkList);
    setHash(fileHash);
    const { shouldUpload, uploadedList } = await verifyUpload(file.name, fileHash);
    if (!shouldUpload) {
      message.success('秒传：上传成功');
      return;
    }
    const chunks = fileChunkList.map((item, index) => ({
      chunk: item.file,
      fileHash: fileHash,
      hash: fileHash + '-' + index, // 文件名 + 数组下标
      index,
      percentage: uploadedList.includes(fileHash + '-' + index) ? 100 : 0,
    }));
    setParts(chunks);
    await uploadChunks(chunks, fileHash, uploadedList);
  };

  useEffect(() => {
    if (!file) return;
    const loaded = parts
      .map((item) => item.percentage * item.chunk.size)
      .reduce((prev, next) => {
        return prev + next;
      }, 0);
    setUploadPercentage(parseInt((loaded / file.size).toFixed(2)));
  }, [parts, file]);

  //? 暂停上传
  const handlePause = () => {
    xhrList.forEach((xhr) => xhr?.abort());
    setXHRList([]);
  };

  //? 恢复上传
  const handleResume = async () => {
    const { uploadedList } = await verifyUpload(file.name, hash);
    await uploadChunks(parts, hash, uploadedList);
  };

  return (
    <>
      <input type="file" onChange={handleFileChange} />
      <Button onClick={handleUpload}>上传文件</Button>
      <Button onClick={handlePause}>暂停上传</Button>
      <Button onClick={handleResume}>恢复上传</Button>
      <div>
        计算文件hash:
        <Progress percent={hashPercent} />
      </div>
      <div>
        上传进度：
        <Progress percent={uploadPercentage} />
      </div>
      {parts.map((item) => {
        return (
          <div key={item.index}>
            切片{item.hash}：<Progress percent={item.percentage} />
          </div>
        );
      })}
    </>
  );
};

export default App;
