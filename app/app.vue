<template>
  <NuxtRouteAnnouncer />
  <NuxtPage />
  <ClientOnly>
    <Toaster
      position="top-center"
      rich-colors
      :offset="{ top: 'calc(env(safe-area-inset-top) + 12px)' }"
      :toast-options="{
        class: 'mobile-toast',
      }"
    />
  </ClientOnly>
</template>

<script setup lang="ts">
import { Toaster } from 'vue-sonner'
</script>
