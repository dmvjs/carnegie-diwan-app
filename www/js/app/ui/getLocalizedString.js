module.exports = function (options, language) {
    if (options !== undefined) {
        if (language !== undefined) {
            if (language === "ar" && options["ar"] !== undefined) {
                return options["ar"];
            } else if (language === "zh" && options["zh"] !== undefined) {
                return options["zh"];
            } else if (language === "ru" && options["ru"] !== undefined) {
                return options["ru"];
            } else if (options["en"] !== undefined) {
                return options["en"];
            }
        }
        if (window.__languageForCarnegie === "ar" && options["ar"] !== undefined) {
            return options["ar"];
        } else if (window.__languageForCarnegie === "zh" && options["zh"] !== undefined) {
            return options["zh"];
        } else if (window.__languageForCarnegie === "ru" && options["ru"] !== undefined) {
            return options["ru"];
        } else if (options["en"] !== undefined) {
            return options["en"];
        }
    }
    return void 0
};