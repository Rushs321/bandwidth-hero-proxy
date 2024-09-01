const fetch = require('node-fetch');
const pick = require('lodash').pick;
const shouldCompress = require('./shouldCompress');
const redirect = require('./redirect');
const compress = require('./compress');
const copyHeaders = require('./copyHeaders');

async function proxy(req, res) {
  try {
    const response = await fetch(req.params.url, {
      headers: {
        ...pick(req.headers, ['cookie', 'dnt', 'referer']),
        'user-agent': 'Bandwidth-Hero Compressor',
        'x-forwarded-for': req.headers['x-forwarded-for'] || req.ip,
        via: '1.1 bandwidth-hero'
      },
      method: 'GET',
      compress: true,
      redirect: 'follow',
    });

    if (!response.ok) {
      return redirect(req, res);
    }

    copyHeaders(response, res);
    res.setHeader('content-encoding', 'identity');
    req.params.originType = response.headers.get('content-type') || '';
    req.params.originSize = parseInt(response.headers.get('content-length'), 10) || 0;

    if (shouldCompress(req)) {
      await compress(req, res, response.body);
    } else {
      res.setHeader('x-proxy-bypass', 1);
      response.body.pipe(res);
    }
  } catch (err) {
    redirect(req, res);
  }
}

module.exports = proxy;
