/**
 * Build a Vaadin Icons sub-selection iconset and iconfont.
 */

'use strict';

const gulp = require('gulp');
const iconfont = require('gulp-iconfont');
const modify = require('gulp-modify');
const cheerio = require('cheerio');
const concat = require('gulp-concat');
const sort = require('gulp-sort');
const path = require('path');

const vaadinIconFontData = require('./assets/vaadin-font-icons.json');

const cxlVaadinIconset = [
  'check-circle.svg',
  'comment.svg',
  'ellipsis-dots-v.svg',
  'external-link.svg',
  'facebook.svg',
  'link.svg',
  'play-circle-o.svg',
  'quote-right.svg',
  'star.svg',
  'thumbs-down.svg',
  'thumbs-down-o.svg',
  'thumbs-up.svg',
  'thumbs-up-o.svg',
  'twitter.svg',
];

/**
 * Normalize file sort order across platforms (OS X vs Linux, maybe others).
 *
 * Before: `[..., 'eye-disabled', 'eye', ...]`
 * After:  `[..., 'eye', 'eye-disabled', ...]`
 *
 * Order of appearance impacts assigned Unicode codepoints, and sometimes build diffs.
 *
 * @see https://github.com/nfroidure/svgicons2svgfont/pull/82
 * @see https://github.com/nfroidure/svgicons2svgfont/blob/master/src/filesorter.js
 * @see http://support.ecisolutions.com/doc-ddms/help/reportsmenu/ascii_sort_order_chart.htm
 */
function sortIconFilesNormalized(file1, file2) {
  return file1.replace(/-/g, '~').localeCompare(file2.replace(/-/g, '~'), 'en-US');
}

gulp.task('icons', function() {
  return gulp.src(cxlVaadinIconset, {cwd: './assets/svg'})
    .pipe(sort({
      comparator: function(file1, file2) {
        return sortIconFilesNormalized(file1.relative, file2.relative);
      }
    }))
    .pipe(modify({
      fileModifier: function(file, contents) {
        var id = path.parse(file.path).name;
        var svg = cheerio.load(contents, {xmlMode: true})('svg');
        // Remove fill attributes.
        svg.children('[fill]').removeAttr('fill');
        // Output the "meat" of the SVG as group element.
        return '<g id="' + id + '">' + svg.children() + '</g>';
      }
    }))
    .pipe(concat('iconset.html'))
    .pipe(modify({
      fileModifier: function(file, contents) {
        /* eslint-disable max-len */
        // Enclose all icons in an iron-iconset-svg
        return /* html */`<!-- NOTICE: Generated with 'gulp icons' -->
<!--
@license
Copyright (c) 2019 Vaadin Ltd.
This program is available under Apache License Version 2.0, available at https://vaadin.com/license/
-->

<link rel="import" href="../iron-iconset-svg/iron-iconset-svg.html">

<iron-iconset-svg name="vaadin" size="16">
<svg><defs>
` + contents + `
</defs></svg>
</iron-iconset-svg>
`;
        /* eslint-enable max-len */
      }
    }))
    .pipe(gulp.dest('.'));
});

gulp.task('iconfont', function() {
  return gulp.src(cxlVaadinIconset, {cwd: './assets/svg'})
    .pipe(sort({
      comparator: function(file1, file2) {
        return sortIconFilesNormalized(file1.relative, file2.relative);
      }
    }))
    .pipe(iconfont({
      fontName: 'vaadin-icons',
      formats: ['woff', 'woff2'],
      fontHeight: 1000,
      ascent: 850,
      descent: 150,
      fixedWidth: true,
      normalize: true,
      /**
       * Avoid `@vaadin/vaadin-lumo-styles` default Unicode codepoints conflict.
       * This is a one-way callback street.
       *
       * @param file
       * @param cb
       * @see https://github.com/nfroidure/svgicons2svgfont#optionsmetadataprovider
       */
      metadataProvider: function(file, cb) {
        require('svgicons2svgfont/src/metadata')({
          prependUnicode: false
        })(file, function(err, metadata) {
          const glyphData = vaadinIconFontData.find(iconData => metadata.name === iconData.name);

          metadata.unicode = [ String.fromCodePoint(parseInt(`0x${glyphData.code}`, 16)) ];

          cb(err, metadata);
        });
      },
    }))
    .on('glyphs', function(glyphs, options) {
      glyphs.forEach((g, idx) => {
        console.log(g.name, '\\' + g.unicode[0].charCodeAt(0).toString(16));
      });

      return glyphs;
    })
    .pipe(gulp.dest('.'))
});

// Generates an AsciiDoc table of all icons from the JSON metadata.
/* eslint-disable no-console */
gulp.task('docs:table', () => {
  const iconData = require('./assets/vaadin-font-icons.json');

  console.log('[width="100%", options="header"]');
  console.log('|======================');
  console.log('| Icon | Name | Ligature | Unicode | Categories | Tags');
  iconData.forEach((icon) => {
    const {name, code} = icon;
    const categories = icon.categories.join(', ');
    const meta = icon.meta.join(', ');
    console.log(`| image:../assets/png/${name}.png[] | [propertyname]#${name}# | ${name} | ${code} | ${categories} | ${meta}`);
  });
  console.log('|======================');
});
/* eslint-enable no-console */
