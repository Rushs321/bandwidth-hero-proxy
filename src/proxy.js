const request = require('request');
const pick = require('lodash').pick;
const shouldCompress = require('./shouldCompress');
const redirect = require('./redirect');
const compress = require('./compress');
const bypass = require('./bypass');
const copyHeaders = require('./copyHeaders');

function proxy(req, res) {
  const reqStream = request.get(
    req.params.url,
    {
      headers: {
        ...pick(req.headers, ['cookie', 'dnt', 'referer']),
        'user-agent': 'Bandwidth-Hero Compressor',
        'x-forwarded-for': req.headers['x-forwarded-for'] || req.ip,
        via: '1.1 bandwidth-hero'
      },
      timeout: 10000,
      maxRedirects: 5,
      encoding: null,
      strictSSL: false,
      gzip: true,
      jar: true
    }
  );

  reqStream.on('response', (origin) => {
    if (origin.statusCode >= 400) {
      return redirect(req, res);
    }

    copyHeaders(origin, res);
    res.setHeader('content-encoding', 'identity');
    req.params.originType = origin.headers['content-type'] || '';

    // We're not aware of the original size at this point.
    req.params.originSize = parseInt(origin.headers['content-length'], 10) || 0;

    if (shouldCompress(req)) {
      compress(req, res, reqStream);
    } else {
      bypass(req, res, reqStream);
    }
  });

  reqStream.on('error', (err) => {
    redirect(req, res);
  });
}

module.exports = proxy;
