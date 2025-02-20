import fs from 'fs/promises';
import path from 'path';

const FILES_TO_COPY = [
  'client/src',
  'server',
  'shared',
  'package.json',
  'tsconfig.json',
  'vite.config.ts',
  'postcss.config.js',
  'tailwind.config.ts',
  'theme.json',
  'glitch.json'
];

async function exportProject() {
  const exportDir = 'chore-tracker-export';

  // Create export directory
  await fs.mkdir(exportDir, { recursive: true });

  // Copy files
  for (const file of FILES_TO_COPY) {
    const source = path.join(process.cwd(), file);
    const dest = path.join(process.cwd(), exportDir, file);

    await fs.cp(source, dest, { recursive: true });
  }

  // Create README with instructions
  const readme = `# Chore Tracker App

This is your personal chore tracking application that lets you manage chores and rewards.

## Deploying to Glitch

1. Go to [Glitch.com](https://glitch.com) and create a free account
2. Click "New Project" and choose "Import from GitHub"
3. Upload all these files to your Glitch project using the "Assets" section
4. Once uploaded, Glitch will automatically install dependencies and start your app
5. You'll need to set one environment variable:
   - Click "🔑 .env" in the sidebar
   - Add: SESSION_SECRET=your-random-secret-here
   (replace 'your-random-secret-here' with any random string)

Your app will be live at your-project-name.glitch.me!

## Running Locally (Alternative)

1. Install Node.js from https://nodejs.org (version 18 or higher)
2. Open terminal/command prompt in this folder
3. Run these commands:
   \`\`\`
   npm install
   npm run dev
   \`\`\`
4. Open http://localhost:5000 in your browser
`;

  await fs.writeFile(path.join(exportDir, 'README.md'), readme);

  console.log('Project exported to:', exportDir);
}

exportProject();