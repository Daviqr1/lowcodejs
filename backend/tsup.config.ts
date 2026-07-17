import { fixImportsPlugin } from 'esbuild-fix-imports-plugin';
import { glob } from 'glob';
import { access, copyFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'application/**/*.ts',
    'bin/**/*.ts',
    'config/**/*.ts',
    'database/**/*.ts',
    'start/**/*.ts',
    'extensions/**/*.ts',
    'hooks/**/*.ts',
  ],
  ignoreWatch: ['node_modules'],
  outDir: 'build',
  target: 'es2024',
  format: ['esm'],
  bundle: false,
  clean: true,
  esbuildPlugins: [fixImportsPlugin()],
  banner: {
    js: "import 'reflect-metadata';",
  },
  async onSuccess(): Promise<void> {
    const patterns: Array<{ pattern: string; label: string }> = [
      { pattern: 'extensions/**/manifest.json', label: 'manifest.json' },
      { pattern: 'templates/**/*.ejs', label: 'template.ejs' },
      { pattern: 'scripts/**/*.sh', label: '*.sh' },
      { pattern: 'docker-entry-point.sh', label: 'docker-entry-point.sh' },
    ];

    for (const { pattern, label } of patterns) {
      const matches = await glob(pattern);
      for (const src of matches) {
        const dst = join('build', src);
        await mkdir(dirname(dst), { recursive: true });
        await copyFile(src, dst);
      }
      console.info(
        `[tsup:onSuccess] copied ${matches.length} ${label} -> build/`,
      );
    }

    const storageDir = join(process.cwd(), '_storage');
    const defaultLogos = ['logo-small.webp', 'logo-large.webp'];

    let copied = 0;
    for (const filename of defaultLogos) {
      const src = join('templates/images', filename);
      const dst = join(storageDir, filename);
      try {
        await access(dst);
      } catch {
        await mkdir(storageDir, { recursive: true });
        await copyFile(src, dst);
        copied++;
      }
    }
    console.info(
      `[tsup:onSuccess] ${copied} logo(s) copiada(s) para _storage/ (${defaultLogos.length - copied} já existiam)`,
    );
  },
});
