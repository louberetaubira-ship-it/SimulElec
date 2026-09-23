/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdf-parse et xlsx font des require dynamiques / lisent des fichiers :
  // on les laisse hors du bundle serveur pour qu'ils s'exécutent tels quels.
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'xlsx'],
    // Images des schémas corrigés : hors de `public/`, lues par la route gardée
    // `/api/sujet/image` ; à embarquer dans la fonction serveur au déploiement.
    outputFileTracingIncludes: {
      '/api/sujet/image': ['./private/corriges/**/*'],
    },
  },
};

export default nextConfig;
