import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.a78a4fc43e1247218eb15208a3fb7291',
  appName: 'Brixon',
  webDir: 'dist',
  server: {
    url: 'https://a78a4fc4-3e12-4721-8eb1-5208a3fb7291.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  ios: {
    contentInset: 'always',
    allowsLinkPreview: false,
    backgroundColor: '#0F1D3D',
    preferredContentMode: 'mobile',
  },
  android: {
    backgroundColor: '#0F1D3D',
    allowMixedContent: false,
  },
};

export default config;
