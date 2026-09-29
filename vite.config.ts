import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';

function singleFileBuild(): Plugin {
  return {
    name: 'single-file-build',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const html = bundle['index.html'];
      if (!html || html.type !== 'asset') {
        throw new Error('Could not find the generated index.html');
      }

      let document = String(html.source);
      const inlineAsset = (url: string) => {
        const fileName = decodeURIComponent(url).replace(/^\.?\//, '');
        const asset = bundle[fileName];
        if (!asset) {
          throw new Error(`Could not inline generated asset: ${fileName}`);
        }

        const source =
          asset.type === 'chunk'
            ? asset.code
            : typeof asset.source === 'string'
              ? asset.source
              : new TextDecoder().decode(asset.source);
        delete bundle[fileName];
        return source;
      };

      let inlinedScripts = 0;
      document = document.replace(
        /<script\b[^>]*\bsrc=(["'])([^"']+)\1[^>]*>\s*<\/script>/gi,
        (_tag, _quote: string, url: string) => {
          inlinedScripts += 1;
          const source = inlineAsset(url).replace(/<\/script/gi, '<\\/script');
          return `<script type="module">${source}</script>`;
        },
      );

      document = document.replace(
        /<link\b(?=[^>]*\brel=["']stylesheet["'])[^>]*>/gi,
        (tag) => {
          const url = /\bhref=["']([^"']+)["']/i.exec(tag)?.[1];
          if (!url) {
            throw new Error('Could not find stylesheet URL in generated HTML');
          }
          if (/^(?:[a-z]+:)?\/\//i.test(url)) {
            return tag;
          }
          const source = inlineAsset(url).replace(/<\/style/gi, '<\\/style');
          return `<style>${source}</style>`;
        },
      );

      document = document.replace(
        /<link\b[^>]*\brel=["']modulepreload["'][^>]*>/gi,
        '',
      );
      if (inlinedScripts === 0) {
        throw new Error('Could not find the generated JavaScript entry point');
      }

      html.source = document;
      for (const fileName of Object.keys(bundle)) {
        if (fileName !== html.fileName) {
          delete bundle[fileName];
        }
      }
    },
  };
}

export default defineConfig(() => {
  return {
    base: './',
    plugins: [react(), tailwindcss(), singleFileBuild()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
