
function getLocalDate (options) {
    var year = options.year;
    var month = options.month;
    var date = options.date;

    if (year !== undefined && month !== undefined && date !== undefined) {
        if (window.__languageForCarnegie === "ar") {
            return "" + year + ". " + month + ". " + date
        } else if (window.__languageForCarnegie === "zh") {
            return "" + year + "年" + months["zh"][month] + date + "日"
        } else if (window.__languageForCarnegie === "ru") {
            return "" + date + " " + months["ru"][month] + " " + year;
        }
    }
    return void 0;
}

module.exports = function getStandardDateFromPubDate (pubDate) {
    //var sample = "Fri, Apr 15 2016 8:58 AM EST";
    if (pubDate !== undefined && pubDate.split !== undefined) {
        var parts = pubDate.split(" ");
        //alert(pubDate);
        if (parts.length >= 5) {
            var first = monthToInt(parts[1]) || parseInt(parts[1], 10);
            var second = monthToInt(parts[2]) || parseInt(parts[2], 10);
            var year = parseInt(parts[3], 10);
            var hour = standardHour(parts[4], parts[5]);
            var minute = parts[4].split(":").pop();
            var month = parts[1].length > parts[2].length ? first : second;
            var date = parts[1].length > parts[2].length ? second : first;
            //alert("" + month + " " + date + " " + year + " " + hour + " " + minute);
            //return new Date(Date.UTC(year, month, date, hour, minute));
            return getLocalDate({year: year, month: month, date: date});
        }
    }
    return void 0;
};

var months = {
    ru: ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"],
    zh: ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"],
    ar: ["كانون الثاني/يناير","شباط/فبراير","آذار/مارس","نيسان/أبريل","أيار/مايو","حزيران/يونيو","تموز/يوليو","آب/أغسطس","أيلول/سبتمبر","تشرين الأول/أكتوبر","تشرين الأول/نوفمبر","كانون الأول/ديسمبر"],
    en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
};

var days = {
    ru: ["Воскресенье","Понедельник","Вторник","Среда","Четверг","Пятница","Суббота"],
    zh: ["星期日","星期一","星期二","星期三","星期四","星期五","星期六"],
    ar: ["الأحد","الاثنين","الثلثاء","الأربعاء","الخميس","الجمعة","السبت"],
    en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
};

function monthToInt(month) {
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (var i = 0; i < months.length; i += 1) {
        if (month.indexOf(months[i]) > -1) {
            return i
        }
    }
    return void 0;
}

function standardHour (time, ampm) {
    if (time !== undefined && ampm !== undefined) {
        var hourInt = parseInt(time, 10);
        var hour = ampm.toUpperCase() === "AM" ? hourInt : (hourInt + 12);
        if (hour !== undefined && hour >= 0 && hour <= 23) {
            return hour
        }
    }
    return void 0;
}