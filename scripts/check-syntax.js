const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourceDirectories = ['config', 'controllers', 'data', 'middleware', 'models', 'routes', 'services', 'utils'];
const files = ['app.js', 'server.js', 'public/app.js'];

for (const directory of sourceDirectories) {
  for (const entry of fs.readdirSync(path.join(root, directory), { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.js')) files.push(path.join(directory, entry.name));
  }
}

for (const file of files) {
  execFileSync(process.execPath, ['--check', path.join(root, file)], { stdio: 'inherit' });
}

console.log(`Syntax check passed for ${files.length} JavaScript files.`);
