import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// Custom plugin to handle WASM and worker file naming
function preserveAssetNames() {
	return {
		name: 'preserve-asset-names',
		configResolved(/** @type {any} */config) {
			// Override the assetFileNames function after SvelteKit sets it
			const originalAssetFileNames = config.build.rollupOptions.output?.assetFileNames;
			if (config.build.rollupOptions.output) {
				config.build.rollupOptions.output.assetFileNames = (/** @type {import('vite').Rollup.CustomPluginOptions} */ assetInfo) => {
					const info = assetInfo.name || '';
					// Keep original names for WASM files and worker-related assets
					if (info.endsWith('.wasm') || info.includes('worker') || info.includes('sql-wasm')) {
						return '[name].[ext]';
					}
					// Use the original function for other assets
					if (typeof originalAssetFileNames === 'function') {
						return originalAssetFileNames(assetInfo);
					}
					return originalAssetFileNames || 'assets/[name]-[hash].[ext]';
				};
			}
		}
	};
}

export default defineConfig({
	assetsInclude: ['**/*.bin', '**/*.wasm'],
	build: {
		target: ['edge134', 'esnext'],
		rollupOptions: {
			output: {
				// Ensure workers are properly chunked
				manualChunks: (id) => {
					if (id.includes('worker')) {
						return 'worker';
					}
				}
			}
		}
	},
	worker: {
		format: 'es',
		rollupOptions: {
			output: {
				// Preserve original names for WASM files in workers
				assetFileNames: (/** @type {any} */ assetInfo) => {
					const info = assetInfo.name || '';
					// Keep original names for WASM files
					if (info.endsWith('.wasm') || info.includes('sql-wasm')) {
						return 'assets/[name].[ext]';
					}
					return 'assets/[name]-[hash].[ext]';
				}
			}
		}
	},
	// @ts-ignore
	plugins: [sveltekit(), preserveAssetNames()],
});
