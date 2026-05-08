<script setup lang="ts">
import type { CreatorStep } from '~/types/creator'
import { cn } from '~/lib/utils'
import { ArrowLeft, Clock3, User, ChevronRight } from 'lucide-vue-next'

const router = useRouter()

const props = defineProps<{
  elevated?: boolean
  step?: CreatorStep
}>()

const emit = defineEmits<{
  back: []
}>()

const { user } = useAuth()

const isHome = computed(() => !props.step || props.step === 'platform')
const maskedPhone = computed(() => {
  if (!user.value?.phone) return ''
  return `${user.value.phone.slice(0, 3)}****${user.value.phone.slice(7)}`
})
</script>

<template>
  <header
    :class="cn(
      'fixed left-0 right-0 top-0 z-30 mx-auto w-full max-w-[600px] transition-all duration-300',
      elevated ? 'bg-white/85 shadow-[0_1px_20px_rgba(0,0,0,0.06)] backdrop-blur-xl' : 'bg-transparent',
    )"
  >
    <div class="relative h-[56px] px-[16px] pt-safe-top">
      <!-- 左侧 -->
      <div class="absolute left-[16px] top-1/2 z-10 flex -translate-y-1/2 justify-start">
        <button
          v-show="isHome"
          type="button"
          class="group flex items-center gap-[2px] rounded-full py-[6px] pl-[8px] pr-[6px] text-zinc-400 transition-all duration-200 hover:bg-zinc-100/80 hover:text-zinc-600"
          @click="router.push('/history')"
        >
          <Clock3 class="size-[16px]" />
          <span class="text-[13px] font-light">历史</span>
          <ChevronRight class="size-[12px] opacity-0 -ml-[4px] transition-all duration-200 group-hover:opacity-100 group-hover:ml-0" />
        </button>
        <button
          v-show="!isHome"
          type="button"
          class="flex size-[36px] items-center justify-center rounded-full text-zinc-600 transition-colors duration-200 hover:bg-zinc-100/80 active:bg-zinc-200/60"
          @click="emit('back')"
        >
          <ArrowLeft class="size-[20px]" />
        </button>
      </div>

      <!-- 中间 -->
      <div class="flex h-full items-center justify-center text-center">
        <p class="text-[15px] font-medium text-zinc-950 tracking-tight">
          {{ step === 'industry' ? '选择场景' : step === 'tone' ? '选择风格' : '' }}
        </p>
      </div>

      <!-- 右侧 -->
      <div class="absolute right-[16px] top-1/2 z-10 flex -translate-y-1/2 justify-end">
        <button
          v-if="isHome"
          type="button"
          class="group shrink-0 whitespace-nowrap flex items-center gap-[6px] rounded-full transition-all duration-200"
          :class="user
            ? 'bg-zinc-900 text-white pl-[10px] pr-[8px] py-[6px] hover:bg-zinc-800 shadow-sm'
            : 'border border-zinc-200 bg-white text-zinc-600 pl-[12px] pr-[8px] py-[6px] hover:border-zinc-300 hover:shadow-sm'"
          @click="router.push('/login')"
        >
          <template v-if="user">
            <div class="flex size-[18px] items-center justify-center rounded-full bg-white/20 text-[10px] font-medium">
              {{ user.phone?.slice(-2) }}
            </div>
            <span class="max-w-[50px] truncate text-[12px] font-medium">{{ maskedPhone }}</span>
          </template>
          <template v-else>
            <User class="size-[14px]" />
            <span class="text-[13px]">登录</span>
          </template>
          <ChevronRight class="size-[12px] opacity-60 transition-transform duration-200 group-hover:translate-x-[1px]" />
        </button>
        <div v-else class="size-[36px]" aria-hidden="true" />
      </div>
    </div>
  </header>
</template>
