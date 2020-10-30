const axios = require('axios');
const fs = require('fs');

(async function() {
const importRegex = /@import url\("(.*)"\);/g;
const svgRegex = /url\("(https:\/\/.*\.svg)"\)/g;
const imgRegex = /url\("?(https:\/\/.*)"?\)/g;
const nonQuoteRegex = /url\(([^"'].*[^"'])\)/g;

async function replaceAsync(str, regex, asyncFn) {
  const promises = [];
  str.replace(regex, (match, ...args) => {
      const promise = asyncFn(match, ...args);
      promises.push(promise);
  });
  const data = await Promise.all(promises);
  return str.replace(regex, () => data.shift());
}

console.log(process.argv[2]);

let css = fs.readFileSync(process.argv[2], 'utf8');

while (true) {
  let matches = 0;

  css = await replaceAsync(css, importRegex, async (_, url) => {
    if (url.includes('usrbg')) return '';

    console.log({'type': 'import', full: _, url});

    let req = await axios.get(url);

    matches++;

    return req.data;
  });

  console.log(matches);

  if (matches === 0) break;
}

console.log();

css = await replaceAsync(css, svgRegex, async (_, url) => {
  console.log(url);

  let req = await axios.get(url);
  let data = encodeURIComponent(req.data);

  let uri = `data:image/svg+xml,${data}`;

  return `url("${uri}")`;
});

console.log();

css = await replaceAsync(css, imgRegex, async (_, url) => {
  if (url.includes('cdn.discordapp.com')) return _;

  url = url.replace('"', '');

  if (url.includes('css')) return;

  console.log(url);

  let req = await axios.get(url, {
    responseType: 'arraybuffer'
  });

  let data = req.data.toString('base64');

  let uri = `data:image/${url.split('.').pop()},${data}`;

  return `url("${uri}")`;
});

console.log();

css = css.replace(/\/\*.*\*\//g, '');
css = css.replace(/\n/g, '');

/*css = css.replace(nonQuoteRegex, (_, url) => {
  console.log(url);

  return `url("${url}")`;
});

css = css.replace(/url\(['"]data\:image\/svg\+xml\; utf-8\,(.*)['"]\)/g, (_, xml) => {
  console.log(xml);

  return `url('data:image/svg+xml,${encodeURIComponent(xml)}')`;
});*/

fs.writeFileSync('out.css', css);
})();
