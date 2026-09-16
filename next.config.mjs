/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdf-parse et xlsx font des require dynamiques / lisent des fichiers :
  // on les laisse hors du bundle serveur pour qu'ils s'exécutent tels quels.
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'xlsx'],
  },
};

export default nextConfig;
