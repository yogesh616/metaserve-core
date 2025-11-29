// metaserve-core.js
const fs = require('fs').promises;
const path = require('path');
const url = require('url');

class MetaServe {
  constructor(options = {}) {
    this.plugins = new Map();
    this.debug = !!options.debug;
    this.timeout = options.timeout || 1500;
    this.maxSize = options.maxSize || 200 * 1024 * 1024; // 200MB
  }

  register(ext, parserFn) {
    if (!ext.startsWith('.')) ext = '.' + ext;
    this.plugins.set(ext.toLowerCase(), parserFn);
  }

  /**
   * Returns a Node HTTP request handler
   * @param {string} rootPath 
   */
  getHandler(rootPath) {
    const logicalRoot = path.resolve(rootPath);

    return async (req, res) => {
      try {
        // Parse URL
        const parsedUrl = url.parse(req.url, true);
        const query = parsedUrl.query;
        const pathname = decodeURIComponent(parsedUrl.pathname);

        if (!query.meta) return false; // not a metadata request

        // Normalize path
        const relativePath = pathname.replace(/^[\/\\]+/, '');
        const logicalFilePath = path.resolve(logicalRoot, relativePath);

        // Symlink + traversal protection
        const realRoot = await fs.realpath(logicalRoot);
        const realFilePath = await fs.realpath(logicalFilePath);

        const rel = path.relative(realRoot, realFilePath);
        const isInside = rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));

        if (!isInside) {
          if (this.debug) console.warn("MetaServe: Access Denied", realFilePath);
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: "Access denied" }));
          return true;
        }

        // Stat & size check
        const stats = await fs.stat(realFilePath);
        if (stats.size > this.maxSize) {
          res.writeHead(413, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: "File too large",
            limit: this.maxSize
          }));
          return true;
        }

        // Base metadata
        const ext = path.extname(realFilePath).toLowerCase();
        let meta = {
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          type: ext
        };

        // Plugin execution
        const parser = this.plugins.get(ext);
        if (parser) {
          try {
            const parserPromise = parser(realFilePath);
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Timeout")), this.timeout)
            );
            const extra = await Promise.race([parserPromise, timeoutPromise]);
            Object.assign(meta, extra);
          } catch (err) {
            meta._warning = err.message === "Timeout" ? "Parser timed out" : "Parser failed";
            if (this.debug) console.error(`MetaServe Plugin Error (${ext}):`, err.message);
          }
        }

        // Send JSON response
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(meta));
        return true;

      } catch (err) {
        if (this.debug) console.error("MetaServe Error:", err.message);
        return false; // let user handle fallback
      }
    };
  }
}

module.exports = MetaServe;
