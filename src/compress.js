const sharp = require('sharp');
const redirect = require('./redirect');

function compress(req, res, inputStream) {
  const format = req.params.webp ? 'webp' : 'jpeg';

  // Create a Sharp instance for streaming
  const transformer = sharp()
    .grayscale(req.params.grayscale)
    .toFormat(format, {
      quality: req.params.quality,
      progressive: true,
      optimizeScans: true
    });

  let isTransformError = false;
  let originalSize = 0;
  let compressedSize = 0;

  // Handle the transformation
  inputStream
    .on('data', (chunk) => {
      originalSize += chunk.length;
      transformer.write(chunk);
    })
    .on('end', () => {
      transformer.end();
    })
    .on('error', (err) => {
      isTransformError = true;
      redirect(req, res);
    });

  transformer
    .on('data', (chunk) => {
      if (res.headersSent) {
        return;
      }
      compressedSize += chunk.length;
      res.write(chunk);
    })
    .on('end', () => {
      if (!isTransformError) {
        res.setHeader('content-type', `image/${format}`);
        res.setHeader('content-length', compressedSize);
        res.setHeader('x-original-size', originalSize);
        res.setHeader('x-bytes-saved', originalSize - compressedSize);
        res.end();
      }
    })
    .on('error', (err) => {
      if (!res.headersSent) {
        redirect(req, res);
      }
    });
}

module.exports = compress;
