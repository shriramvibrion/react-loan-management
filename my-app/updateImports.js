const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src');

function replaceInDir(currentDir) {
  const files = fs.readdirSync(currentDir);
  for (const file of files) {
    const fullPath = path.join(currentDir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      replaceInDir(fullPath);
    } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Compute relative depth
      const relativeToSrc = path.relative(dir, currentDir);
      let depth = relativeToSrc === '' ? 0 : relativeToSrc.split(path.sep).length;
      
      let prefix = './';
      if (depth === 1) prefix = '../';
      if (depth === 2) prefix = '../../';
      if (depth === 3) prefix = '../../../';
      
      let updated = false;
      if (content.includes('context/AuthContext')) {
        content = content.replace(/import\s+\{\s*(useAuth|AuthProvider)\s*\}\s+from\s+['"]([^'"]*)context\/AuthContext['"]/g, 
          `import { $1 } from "${prefix}auth/AuthContext"`);
        updated = true;
      }
      
      if (content.includes('components/routes/ProtectedRoute')) {
         content = content.replace(/import\s+ProtectedRoute\s+from\s+['"]([^'"]*)components\/routes\/ProtectedRoute['"]/g,
          `import ProtectedRoute from "${prefix}routes/ProtectedRoute"`);
         updated = true;
      }

      if (updated) {
        fs.writeFileSync(fullPath, content);
        console.log('Updated:', fullPath);
      }
    }
  }
}

replaceInDir(dir);
