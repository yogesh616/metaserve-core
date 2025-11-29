const { imageSizeFromFile } = require('image-size/fromFile');

module.exports = async function imageParser(filePath) {
  const d = await imageSizeFromFile(filePath);
  return {
    width: d.width,
    height: d.height,
    format: d.type,
    orientation: d.orientation
  };
};
