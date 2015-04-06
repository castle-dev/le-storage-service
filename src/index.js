/**
 * Builds converter objects
 * @constructor
 * @returns {Object} converter
 */
var ConverterService = function () {
  /**
   * Strips html from a string
   * @param {String} html the html string to be escaped
   */
  this.escape = function(html) {
    return String(html)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  };
  /**
   * Adds html back to an escaped string
   * @param {String} html the string to unescape
   */
  this.unescape = function(html) {
    return String(html)
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, '\'')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
  };
};

module.exports = ConverterService;
