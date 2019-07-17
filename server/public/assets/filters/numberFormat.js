Vue.filter('numberFormat', value => {
    var parts = (value + '').split('.'),
        main = parts[0],
        len = main.length,
        output = '',
        i = len - 1;

    while (i >= 0) {
        output = main.charAt(i) + output;
        if ((len - i) % 3 === 0 && i > 0) {
            output = ' ' + output;
        }
        --i;
    }
    console.log(parts[1]);
    if (parts.length > 1) {
        output = `${output}.${parts[1]}`;
    }

    return output;
});
