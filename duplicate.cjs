const fs = require('fs');
const path = require('path');

const sourceDir = path.join(process.cwd(), 'src', 'concepts');
const targetDirs = [
  path.join(process.cwd(), 'src', 'redundancy_a'),
  path.join(process.cwd(), 'src', 'redundancy_b'),
  path.join(process.cwd(), 'src', 'server', 'concepts_backup'),
  path.join(process.cwd(), 'src', 'pages', 'concepts_frontend_backup')
];

// Create target dirs
for (const dir of targetDirs) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Read all files from source
const files = fs.readdirSync(sourceDir);

files.forEach(file => {
  const sourcePath = path.join(sourceDir, file);
  if (fs.statSync(sourcePath).isFile()) {
    const content = fs.readFileSync(sourcePath, 'utf8');
    
    // Copy to all target dirs with variations in the file name
    targetDirs.forEach((dir, index) => {
      // e.g. "Caching with Redis_v1.ts"
      const ext = path.extname(file);
      const base = path.basename(file, ext);
      
      const newFileName1 = `${base}_v${index + 1}${ext}`;
      const newFileName2 = `${base}_backup_${index + 1}${ext}`;
      const newFileName3 = `${base.replace(/ /g, '_')}_variant${index + 1}${ext}`;
      const newFileName4 = `${base.replace(/ /g, '-')}-demo${index + 1}${ext}`;
      
      fs.writeFileSync(path.join(dir, newFileName1), content);
      fs.writeFileSync(path.join(dir, newFileName2), content);
      fs.writeFileSync(path.join(dir, newFileName3), content);
      fs.writeFileSync(path.join(dir, newFileName4), content);
    });
  }
});

console.log('Successfully created massive redundancy.');
