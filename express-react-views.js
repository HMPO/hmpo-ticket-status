// from https://github.com/reactjs/express-react-views

let React = require('react');
let ReactDOMServer = require('react-dom/server');
let assign = require('object-assign');
let _escaperegexp = require('lodash.escaperegexp');

let DEFAULT_OPTIONS = {
    doctype: '<!DOCTYPE html>',
    beautify: false,
    transformViews: true,
    babel: {
        presets: [
            '@babel/preset-react',
            [
                '@babel/preset-env',
                {
                    targets: {
                        node: 'current',
                    },
                },
            ],
        ],
        plugins: ['@babel/transform-flow-strip-types'],
    },
};

function createEngine(engineOptions) {
    let registered = false;
    let moduleDetectRegEx;

    engineOptions = assign({}, DEFAULT_OPTIONS, engineOptions || {});

    function renderFile(filename, options, cb) {
    // Defer babel registration until the first request so we can grab the view path.
        if (!moduleDetectRegEx) {
            // Path could contain regexp characters so escape it first.
            // options.settings.views could be a single string or an array
            moduleDetectRegEx = new RegExp(
                []
                    .concat(options.settings.views)
                    .map(viewPath => '^' + _escaperegexp(viewPath))
                    .join('|')
            );
        }

        if (engineOptions.transformViews && !registered) {
            // Passing a RegExp to Babel results in an issue on Windows so we'll just
            // pass the view path.
            require('@babel/register')(
                assign({only: [].concat(options.settings.views)}, engineOptions.babel)
            );
            registered = true;
        }

        try {
            var markup = engineOptions.doctype;
            let component = require(filename);
            // Transpiled ES6 may export components as { default: Component }
            component = component.default || component;
            markup += ReactDOMServer.renderToStaticMarkup(
                React.createElement(component, options)
            );
        } catch (e) {
            return cb(e);
        } finally {
            if (options.settings.env === 'development') {
                // Remove all files from the module cache that are in the view folder.
                Object.keys(require.cache).forEach(function (module) {
                    if (moduleDetectRegEx.test(require.cache[module].filename)) {
                        delete require.cache[module];
                    }
                });
            }
        }

        if (engineOptions.beautify) {
            // NOTE: This will screw up some things where whitespace is important, and be
            // subtly different than prod.
            let beautifyHTML = require('js-beautify').html;
            markup = beautifyHTML(markup);
        }

        cb(null, markup);
    }

    return renderFile;
}

exports.createEngine = createEngine;
