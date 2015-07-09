function CaseConverter() {
  this.toSnakeCase = toSnakeCase;
  this.toCamelCase = toCamelCase;
}

function toSnakeCase(string) {
  var words = string.split(' ');
  var output = '';
  for (var i = 0; i < words.length; i++) {
    output = output + words[i].charAt(0).toUpperCase() + words[i].slice(1);
  }
  return output;
}

function toCamelCase(string) {
  var snakeCase = toSnakeCase(string);
  return snakeCase.charAt(0).toLowerCase() + snakeCase.slice(1);
}

module.exports = CaseConverter;