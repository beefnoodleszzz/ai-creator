const mobileRootContainingBlockSelectorList = [
  '[data-vaul-drawer]',
  '[data-vaul-overlay]',
  '[data-radix-popper-content-wrapper]',
  '.fixed',
]

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxtjs/tailwindcss',
    '@vite-pwa/nuxt',
    'shadcn-nuxt',
  ],

  css: [
    'vue-sonner/style.css',
    '~/assets/css/tailwind.css',
  ],

  app: {
    head: {
      title: 'AI-Creator-Mobile',
      htmlAttrs: {
        lang: 'zh-CN',
      },
      meta: [
        { name: 'description', content: '移动端专属 AI 自媒体爆款文案生成器' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover' },
        { name: 'theme-color', content: '#09090b' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'AI Creator' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'format-detection', content: 'telephone=no,email=no,address=no' },
      ],
      link: [
        { rel: 'manifest', href: '/manifest.webmanifest' },
        { rel: 'apple-touch-icon', href: '/pwa-icon.svg' },
      ],
    },
  },

  runtimeConfig: {
    openaiApiKey: '',
    openaiBaseUrl: '',
    openaiModel: '',
    openaiFallbackModel: '',
    opsKey: '',
    public: {
      appName: 'AI-Creator-Mobile',
      appCnName: '灵感指令舱',
    },
  },

  nitro: {
    storage: {
      data: {
        driver: process.env.KV_REST_API_URL ? 'vercelKV' : 'memory',
      },
    },
  },

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'AI-Creator-Mobile',
      short_name: 'AI Creator',
      description: '移动端专属 AI 自媒体爆款文案生成器',
      theme_color: '#09090b',
      background_color: '#fafafa',
      display: 'standalone',
      orientation: 'portrait',
      scope: '/',
      start_url: '/',
      lang: 'zh-CN',
      icons: [
        {
          src: '/pwa-icon.svg',
          sizes: 'any',
          type: 'image/svg+xml',
          purpose: 'any maskable',
        },
      ],
    },
    workbox: {
      navigateFallback: '/',
    },
    devOptions: {
      enabled: true,
      type: 'module',
    },
  },

  shadcn: {
    prefix: '',
    componentDir: './app/components/ui',
  },

  tailwindcss: {
    cssPath: '~/assets/css/tailwind.css',
    configPath: 'tailwind.config.js',
    exposeConfig: false,
    viewer: false,
  },

  postcss: {
    plugins: {
      autoprefixer: {},
      'postcss-mobile-forever': {
        appSelector: '#__nuxt',
        viewportWidth: 375,
        maxDisplayWidth: 600,
        border: true,
        rootContainingBlockSelectorList: mobileRootContainingBlockSelectorList,
      },
    },
  },
})
