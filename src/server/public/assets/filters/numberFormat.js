Vue.filter('numberFormat', (value) => {
  const parts = (value + '').split('.');
  const main = parts[0];
  const len = main.length;
  let output = '';
  let i = len - 1;

  while (i >= 0) {
    output = main.charAt(i) + output;
    if ((len - i) % 3 === 0 && i > 0) {
      output = ',' + output;
    }
    --i;
  }

  if (parts.length > 1) {
    output = `${output}.${parts[1]}`;
  }

  return output;
});
