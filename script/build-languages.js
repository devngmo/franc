/**
 * Dependencies.
 */

var fs,
    speakers,
    information,
    declarations,
    trigrams,
    scripts;

fs = require('fs');
speakers = require('speakers').all();
information = require('udhr').information();
declarations = require('udhr').json();
trigrams = require('trigrams').min();
scripts = require('unicode-7.0.0').scripts;

/**
 * Data.
 */

var support,
    topLanguages;

support = {};

topLanguages = [];

/**
 * The minimum number of speakers to be included in
 * `franc`: 1,000,000.
 */

var THRESHOLD;

THRESHOLD = 1000000

/**
 * Transform scripts into global expressions.
 */

var expressions;

expressions = {};

scripts.forEach(function (script) {
    var expression;

    expression = require('unicode-7.0.0/scripts/' + script + '/regex.js');

    expressions[script] = new RegExp(expression.source, 'g');
});

/**
 * Get script information.
 */

function all(object, key) {
    var results = [],
        property,
        value;

    for (property in object) {
        value = object[property];

        if (property === key) {
            results.push(value);
        } else if (typeof value === 'object') {
            results = results.concat(all(value, key));
        }
    }

    return results;
}

function getScriptInformation(code) {
    var declaration,
        content,
        info,
        length,
        name,
        scriptInformation;

    info = information[code];
    declaration = declarations[code];
    content = all(declaration, 'para').join('');
    length = content.length;
    scriptInformation = {};

    Object.keys(expressions).forEach(function (script) {
        var count;

        /**
         * Blacklisted, unimportant for our goal, scripts.
         */

        if (
            script === 'Common' ||
            script === 'Inherited'
        ) {
            return;
        }

        count = content.match(expressions[script]);

        count = (count ? count.length : 0) / length;

        count = Math.round(count * 100) / 100;

        if (count) {
            scriptInformation[script] = count;
        }
    });

    return scriptInformation;
}

/**
 * Get a UDHR key from an ISO code.
 */

var overrides;

overrides = {
    'cmn' : 'cmn_hans',
    'por' : 'por_PT',
    'deu' : 'deu_1996',
    'mai' : 'mai',
    'ron' : 'ron_2006',
    'hau' : 'hau_NG', // no reason.
    'tgl' : 'tgl',
    'ell' : 'ell_monotonic',
    'nya' : 'nya_chinyanja',
    'lin' : 'lin',
    'hat' : 'hat_popular',
    'pes' : 'pes_1',
    'aka' : 'aka_asante', // seems to be more popular?
    'tzm' : 'tzm',
    'khk' : 'khk',
    'cjk' : 'cjk',
    'kng' : 'kng',
    'rmn' : 'rmn',
    'taq' : 'taq'
};

function getUDHRKeyfromISO(iso) {
    var udhr;

    if (iso in overrides) {
        return overrides[iso];
    }

    Object.keys(information).forEach(function (udhrCode) {
        var info,
            currentVersionIndex,
            previousVersionIndex;

        info = information[udhrCode];

        if (info.ISO === iso) {
            if (udhr) {
                console.log(
                    'Multiple UDHRs for a language:', udhr, udhrCode, iso
                );
            }

            udhr = udhrCode;
        }
    });

    return udhr;
}

/**
 * Sort a list of languages by most-popular.
 */

function sort(array) {
    return array.concat().sort(function (a, b) {
        return b.speakers - a.speakers;
    });
}

/**
 * Output.
 */

Object.keys(speakers).forEach(function (iso6393) {
    var language;

    language = speakers[iso6393];

    if (language.speakers >= THRESHOLD) {
        topLanguages.push({
            'speakers' : language.speakers,
            'name' : language.name,
            'iso6393' : iso6393
        });
    }
});

topLanguages.forEach(function (language) {
    var iso;

    iso = language.iso6393;

    language.udhr = getUDHRKeyfromISO(iso);
    language.script = getScriptInformation(language.udhr);

    /**
     * Languages without (accessible) UDHR declaration.
     */

    if (iso === 'tel') {
        language.script['Telugu'] = 0.8;
    }

    if (iso === 'ori') {
        language.script['Oriya'] = 0.8;
    }

    if (iso === 'sin') {
        language.script['Sinhala'] = 0.8;
    }

    if (iso === 'sat') {
        language.script['Ol_Chiki'] = 0.8;
    }

    /**
     * No trigram, and no custom script, available for:
     *
     * - awa (Awadhi): Devanagari, Kaithi, Persian;
     * - snd (Sindhi): Arabic, Devanagari, Khudabadi, and more;
     * - hne (Chhattisgarhi): Devanagari;
     * - asm (Assamese): Assamese (Bengali + two other characters*);
     * - koi (Komi-Permyak): Cyrillic;
     * - raj (Rajasthani): Devanagari;
     * - mve (Marwari): Devanagari, and Mahajani (which is in unicode*);
     * - bjj (Kanauji): Devanagari;
     * - kmr (Northern Kurdish): Latin (main); Perso-Arabic;
     * - kas (Kashmiri): Perso-Arabic, Devanagari, Sharada.
     * - shn (Shan): A Shan script exists, but nearly no one can read it*.
     * - gbm (Garhwali): Devanagari
     * - dyu (Dyula): N'Ko, Latin, Arabic
     * - ksw (S'gaw Karen): Burmese
     * - gno (Northern Gondi): Devanagari, Telugu
     * - bgp (Eastern Balochi): Urdu Arabic, Arabic
     * - unr (Mundari): ?
     * - hoc (Ho): Ol Chiki, Devanagari, Varang Kshiti
     * - pwo (Pwo Western Karen): Burmese
     *
     * *: future interest?
     */
});

/**
 * Detect which languages are unique per script.
 */

topLanguages = topLanguages.filter(function (language) {
    var hasScripts;

    hasScripts = Object.keys(language.script).length !== 0;

    if (!trigrams[language.udhr] && !hasScripts) {
        console.log(
            'Popular language with neither trigrams nor ' +
            'scripts: ' + language.iso6393
        );

        return false;
    }

    return true;
});

/**
 * Japanese is different.
 */

var japanese;

topLanguages = topLanguages.filter(function (language) {
    if (language.iso6393 === 'jpn') {
        japanese = language;
        return false;
    }

    return true;
});

/**
 * Throw when more than one scripts are in use.
 * Also, transform the scripts object into a single key.
 */

topLanguages.forEach(function (language) {
    if (Object.keys(language.script).length > 1) {
        throw new Error(
            'Woops, I found a language which uses more than ' +
            'one script. Franc is not build for that. Exiting.'
        );
    }

    language.script = Object.keys(language.script)[0];
});

topLanguages = sort(topLanguages);

/**
 * Detect languages with unique scripts.
 */

var languagesByScripts;

languagesByScripts = {};

topLanguages.forEach(function (language) {
    var script;

    script = language.script;

    if (!languagesByScripts[script]) {
        languagesByScripts[script] = [];
    }

    languagesByScripts[script].push(language);
});

/**
 * Get singletons and regulars.
 */

var singletons,
    regulars;

singletons = {};
regulars = {};
regularExpressions = {}; // Ha!

Object.keys(languagesByScripts).forEach(function (script) {
    var language;

    if (languagesByScripts[script].length > 1) {
        if (!regularExpressions[script]) {
            regularExpressions[script] = expressions[script];
        }

        regulars[script] = languagesByScripts[script];
    } else {
        language = languagesByScripts[script][0];

        singletons[language.iso6393] = expressions[script];
    }
});

/**
 * Push Japanese to singletons
 */

singletons.jpn = new RegExp(
    expressions.Hiragana.source + '|' +
    expressions.Katakana.source + '|' +
    expressions.Han.source,
    'g'
);

/**
 * Write singletons.
 */

fs.writeFileSync('data/singleton-expressions.js', (function () {
    var expressions;

    expressions = Object.keys(singletons).map(function (key) {
        return key + ': ' + singletons[key]
    }).join(',\n  ');

    return 'module.exports = {\n  ' + expressions + '\n};\n'
})());

/**
 * Write regulars.
 */

fs.writeFileSync('data/regular-expressions.js', (function () {
    var expressions;

    expressions = Object.keys(regularExpressions).map(function (script) {
        return script + ': ' + regularExpressions[script]
    }).join(',\n  ');

    return 'module.exports = {\n  ' + expressions + '\n};\n'
})());

/**
 * Write info on which regular scripts belong to
 * which languages.
 */

fs.writeFileSync('data/language-map.json', (function () {
    var languages;

    languages = {};

    Object.keys(regulars).forEach(function (script) {
        var scriptObject;

        scriptObject = {};

        regulars[script].forEach(function (language) {
            if (trigrams[language.udhr]) {
                scriptObject[language.iso6393] =
                    trigrams[language.udhr].join('|');
            } else {
                console.log(
                    'Popular language without trigrams: ' +
                    language.iso6393
                );
            }
        });

        languages[script] = scriptObject;
    });

    return JSON.stringify(languages, 0, 2);
})());
