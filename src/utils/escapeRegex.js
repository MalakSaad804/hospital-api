/** Escapes special regex characters so user input can be used safely in a search. */
module.exports = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
