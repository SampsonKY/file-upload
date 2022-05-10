const http = require('http');
const path = require('path');
const fse = require('fs-extra');
const multiparty = require('multiparty');

const server  = http.createServer();
const UPLOAD_DIR = path.resolve(__dirname, "target");

// 提取后缀名
const extractExt = filename => {
  return filename.slice(filename.lastIndexOf('.'), filename.length);
}

const resolvePost = req => {
  return new Promise(resolve => {
    let chunk = "";
    req.on('data', data => {
      chunk += data;
    })
    req.on('end', () => {
      resolve(JSON.parse(chunk));
    })
  })
}

// 返回已经上传的切片
const createUploadedList = async fileHash => {
  return fse.existsSync(path.resolve(UPLOAD_DIR, fileHash)) 
    ? await fse.readdir(path.resolve(UPLOAD_DIR, fileHash))
    : []
}

const pipeStream = (path, writeStream) => {
  return new Promise(resolve => {
    const readStream = fse.createReadStream(path);
    readStream.on('end', () => {
      // fse.unlinkSync(path);
      resolve();
    })
    readStream.pipe(writeStream);
  })
}

// 合并切片
const mergeFileChunk = async (filePath, fileHash, size) => {
  const chunkDir = path.resolve(UPLOAD_DIR, fileHash);
  const chunkPaths = await fse.readdir(chunkDir);

  // 根据切片下标进行排序
  chunkPaths.sort((a, b) => a.split("-")[1] - b.split("-")[1]);
  await Promise.all(chunkPaths.map((chunkPath, index) => {
    return pipeStream(
      path.resolve(chunkDir, chunkPath),
      fse.createWriteStream(filePath, {
        start: index * size
      })
    )
  }))
  // fse.rmdirSync(chunkDir);
}

server.on('request', async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  if (req.method === "OPTIONS") {
    res.status = 200;
    res.end();
    return;
  }

  if (req.url === "/verify") {
    const data = await resolvePost(req);
    const { fileHash, filename } = data;
    const ext = extractExt(filename);
    const filePath = path.resolve(UPLOAD_DIR, `${fileHash}${ext}`);
    if (fse.existsSync(filePath)) {
      res.end(JSON.stringify({
        shouldUpload: false
      }));
    } else {
      res.end(JSON.stringify({
        shouldUpload: true,
        uploadedList: await createUploadedList(fileHash)
      }));
    }
  }

  if (req.url === "/merge") {
    const data = await resolvePost(req);
    const { filename, size, fileHash } = data;
    const ext = extractExt(filename);
    const filePath = path.resolve(UPLOAD_DIR, `${fileHash}${ext}`);
    
    await mergeFileChunk(filePath, fileHash, size);
    res.end(JSON.stringify({
      code: 0,
      message: 'file merged success'
    }))
  }

  const multipart = new multiparty.Form();
  
  multipart.parse(req, async (err, fields, files) => {
    if (err) {
      return;
    }
    console.log(fields, files);

    const chunk = files.chunk[0];
    const hash = fields.hash[0];
    const fileHash = fields.fileHash[0];
    const chunkDir = path.resolve(UPLOAD_DIR, fileHash);

    // 切片目录不存在，创建切片目录
    if (!fse.existsSync(chunkDir)) {
      await fse.mkdirs(chunkDir);
    }

    await fse.move(chunk.path, `${chunkDir}/${hash}`);
    res.end('received file chunk');
  })
});

server.listen(3000, () => {
  console.log('listening port 3000');
});