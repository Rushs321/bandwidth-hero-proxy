const sharp = require('sharp');
const { PassThrough } = require('stream');
const fetch = require('node-fetch');
const redirect = require('./redirect');

async function compress(req, res, inputStream) {
  const format = req.params.webp ? 'webp' : 'jpeg';

  const transform = sharp()
    .grayscale(req.params.grayscale)
    .toFormat(format, {
      quality: req.params.quality,
      progressive: true,
      optimizeScans: true
    });

  const passThrough = new PassThrough();
  let originalSize = 0;

  inputStream.on('data', chunk => {
    originalSize += chunk.length;
  });

  inputStream
    .pipe(transform)
    .pipe(passThrough)
    .on('finish', () => {
      const contentType = `image/${format}`;
      const outputSize = passThrough.bytesWritten;

      res.setHeader('content-type', contentType);
      res.setHeader('content-length', outputSize);
      res.setHeader('x-original-size', originalSize);
      res.setHeader('x-bytes-saved', originalSize - outputSize);

      res.status(200).send(passThrough);
    })
    .on('error', () => {
      redirect(req, res);
    });
}

module.exports = compress;
