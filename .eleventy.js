const path = require("path");
const Image = require("@11ty/eleventy-img");

async function imageShortcode(src, alt, sizes) {
  let imgSrc = src;

  // handle same folder images, append the input path to make the path relative 
  // to project folder as 11ty requires it
  if (!imgSrc.startsWith('.')) {
    const inputPath = this.page.inputPath;
    const pathParts = inputPath.split('/');
    pathParts.pop();
    imgSrc = pathParts.join('/') + '/' + src;
  }

  const imageSizes = {
    "320": "small",
    "640": "medium",
    "1280": "large"
  }

  let metadata = await Image(imgSrc, {
    widths: Object.keys(imageSizes).map(k => +k),
    formats: ["avif", "webp", "jpeg"], // order matters, use most performant but partially supported first
    outputDir: "./dist/img/",
    filenameFormat: function (id, src, width, format, options) {
      const extension = path.extname(src);
      const name = path.basename(src, extension);

      const size = imageSizes[width + ""];
      return `${name}_${size}.${format}`;
    }
  });

  let imageAttributes = {
    alt,
    sizes,
    loading: "lazy",
    decoding: "async",
  };

  // You bet we throw an error on missing alt in `imageAttributes` (alt="" works okay)
  return Image.generateHTML(metadata, imageAttributes);
}

function wrapFigure(output, caption) {
  return `
    <figure>
      ${output}
      <figcaption>${caption}</figcaption>
    <figure>
  `
}


function generateHTML(metadata, imageAttributes, detailMetadata, detailMedia, detailSizes) {
  // use the lower resolution width, height and url for the img
  let lowsrc = metadata.jpeg[0];

  const detailOutput = detailMetadata ?
    Object.values(detailMetadata).map(imageFormat => {
      return `  <source type="${imageFormat[0].sourceType}" 
                        srcset="${imageFormat.map(entry => entry.srcset).join(", ")}" 
                        media="${detailMedia}" 
                        sizes="${detailSizes}">`
    }).join('\n') : '';

  const sources = detailOutput +
    Object.values(metadata).map(imageFormat => {
      return `  <source type="${imageFormat[0].sourceType}" srcset="${imageFormat.map(entry => entry.srcset).join(", ")}"  sizes="${imageAttributes.sizes}">`;
    }).join('\n')

  return `<picture>
    ${sources}
      <img
        src="${lowsrc.url}"
        width="${lowsrc.width}"
        height="${lowsrc.height}"
        alt="${imageAttributes.alt}"
        loading="lazy"
        decoding="async">
    </picture>`;
}

async function imageWithDetailShortcode(src, alt, sizes, caption, detailSrc, detailMedia, detailSizes = "100vw") {

  const imageSizes = {
    "320": "small",
    "640": "medium",
    "1280": "large"
  }

  let metadata = await Image(src, {
    widths: Object.keys(imageSizes).map(k => +k),
    formats: ["avif", "webp", "jpeg"], // order matters, use most performant but partially supported first
    outputDir: "./dist/img/",
    filenameFormat: function (id, src, width, format, options) {
      const extension = path.extname(src);
      const name = path.basename(src, extension);

      const size = imageSizes[width + ""];
      return `${name}_${size}.${format}`;
    }
  });

  let detailMetadata = detailSrc && detailMedia ? await Image(detailSrc, {
    widths: Object.keys(imageSizes).map(k => +k),
    formats: ["avif", "webp", "jpeg"], // order matters, use most performant but partially supported first
    outputDir: "./dist/img/",
    filenameFormat: function (id, src, width, format, options) {
      const extension = path.extname(src);
      const name = path.basename(src, extension);

      const size = imageSizes[width + ""];
      return `${name}_${size}.${format}`;
    }
  }) : null;

  let imageAttributes = {
    alt,
    sizes
  };

  const pictureOutput = generateHTML(metadata, imageAttributes, detailMetadata, detailMedia, detailSizes);

  return caption ? wrapFigure(pictureOutput) : pictureOutput;
}


module.exports = eleventyConfig => {
  eleventyConfig.addNunjucksAsyncShortcode("image", imageShortcode);
  eleventyConfig.addNunjucksAsyncShortcode("imageWithDetail", imageWithDetailShortcode);

  // copy css passthough
  eleventyConfig.addPassthroughCopy("styles.css");

  return {
    markdownTemplateEngine: 'njk',
    dataTemplateEngine: 'njk',
    htmlTemplateEngine: 'njk',
    dir: {
      input: 'src',
      output: 'dist'
    }
  };
};