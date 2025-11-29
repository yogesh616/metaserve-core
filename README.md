
# MetaServe-Core

High-performance metadata extractor for static file servers.
Plugin-based. Zero dependencies on the core. Safe by default.

## Why this solves an actual problem

Most servers expose static files but can’t tell you **anything** about those files without reading the whole file or building a custom parser.
Browsers also can't read file stats or metadata for files on the server side.

Typical problems MetaServe solves:

* Need to know the image width/height without loading the image in frontend.
* Need to find heavy assets inside a project.
* Need metadata for different file types without writing a unique parser for each.
* Need server-side metadata checks before UI rendering or build systems.
* Need a single API that returns consistent metadata for any file.

Every frontend framework and SSR system benefits from this capability.

MetaServe is the clean solution they never bothered to make.

---

# Installation

```
npm install metaserve-core
```

---

# Basic Usage

### Server setup (Express example)

```js
const express = require('express');
const path = require('path');
const MetaServe = require('metaserve-core');
const imageParser = require('metaserve-core/plugins/ImageParser');

const app = express();
const publicDir = path.join(__dirname, 'public');

const metaServe = new MetaServe({
  debug: true,
  timeout: 2000
});

// Register image plugins
['.jpg', '.jpeg', '.png', '.gif', '.webp'].forEach(ext =>
  metaServe.register(ext, imageParser)
);

const metaHandler = metaServe.getHandler(publicDir);

app.use((req, res, next) =>
  metaHandler(req, res).then(handled => handled || next())
);

app.use(express.static(publicDir));

app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});

```

---

# Metadata Query Format

To get metadata of `/public/photo.jpg`:

```
/photo.jpg?meta=1
```

### Response example:

```json
{
  "size": 12345,
  "created": "2025-11-29T04:12:19.000Z",
  "modified": "2025-11-29T04:12:19.000Z",
  "type": ".jpg",
  "width": 1920,
  "height": 1080,
  "format": "jpg",
}
```

---

# Features

* Ultra-fast stat-based metadata for all files
* Safe path traversal protection
* Max-size limit to avoid expensive parser operations
* Plugin architecture for any file type
* Timeout protection for buggy plugins
* Zero heavy dependencies in core

---

# Writing a Plugin

A plugin is a simple async function that returns extra metadata.

```js
module.exports = async function(filePath) {
  return {
    customData: "any value"
  };
};
```

Register it:

```js
metaServe.register('.txt', myParser);
```

---

# Built-in Plugins

(metaServe-core never forces plugins; below is optional)

### Image Parser

Use the official MetaServe image plugin:

```js
const imageParser = require('metaserve-image');
metaServe.register('.png', imageParser);
```

---

# Security & Limitations

* Rejects symlink traversal
* Rejects requests outside the root
* Rejects files above 200MB (configurable)
* Rejects slow parsers via timeout

---

# Examples Folder

* **Express**

```js

const express = require('express');
const path = require('path');
const MetaServe = require('metaserve-core'); // Import the package


const app = express();
const publicDir = path.join(__dirname, 'public');

const metaServe = new MetaServe({
  debug: true,
  timeout: 2000
});


const metaHandler = metaServe.getHandler(publicDir);

app.use((req, res, next) =>
  metaHandler(req, res).then(handled => handled || next())
);

app.use(express.static(publicDir));

app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});



```




---

# Contributing

* Open issues for new parsers (PDF, audio, etc.)
* PRs welcome
* Keep plugins optional and core clean

---

