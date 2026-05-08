<script setup lang="ts">
import { toast } from 'vue-sonner'
import { ArrowLeft, LoaderCircle } from 'lucide-vue-next'
import UiInput from '~/components/ui/input/index.vue'
import UiButton from '~/components/ui/button/index.vue'
import UiCard from '~/components/ui/card/index.vue'

const router = useRouter()
const { user, loadToken, refreshMe, sendCode, login, logout } = useAuth()
const { syncFromCloud } = useCreatorHistory()
const { ensureDeviceId } = useDeviceId()

const phone = ref('')
const code = ref('')
const devCode = ref('')
const loading = ref(false)

onMounted(async () => {
  loadToken()
  await refreshMe()
})

async function handleSendCode() {
  if (!/^1\d{10}$/.test(phone.value)) {
    toast.error('请输入有效手机号')
    return
  }
  loading.value = true
  try {
    const data = await sendCode(phone.value)
    devCode.value = data.devCode || ''
    toast.success('验证码已发送')
  } catch (error: any) {
    toast.error(error?.message || '发送失败')
  } finally {
    loading.value = false
  }
}

async function handleLogin() {
  if (!phone.value || !code.value) return
  loading.value = true
  try {
    await login(phone.value, code.value)
    await fetch('/api/auth/bind-device', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...useAuth().authHeaders() },
      body: JSON.stringify({ deviceId: ensureDeviceId() }),
    })
    await syncFromCloud(undefined, useAuth().authHeaders())
    toast.success('登录成功')
    router.back()
  } catch (error: any) {
    toast.error(error?.message || '登录失败')
  } finally {
    loading.value = false
  }
}

async function handleLogout() {
  await logout()
  await syncFromCloud(ensureDeviceId())
  toast.success('已退出')
}
</script>

<template>
  <main class="min-h-[100dvh] bg-gradient-subtle">
    <div class="mx-auto min-h-[100dvh] w-full max-w-[600px]">
      <!-- 顶部导航 -->
      <header class="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-zinc-100">
        <div class="flex h-[56px] items-center px-[16px] pt-safe-top">
          <button
            type="button"
            class="flex size-[36px] items-center justify-center rounded-full hover:bg-zinc-100 transition-colors"
            @click="router.back()"
          >
            <ArrowLeft class="size-[20px] text-zinc-600" />
          </button>
          <h1 class="flex-1 text-center text-[16px] font-medium text-zinc-900">账号</h1>
          <div class="size-[36px]" />
        </div>
      </header>

      <div class="p-[24px]">
        <!-- 已登录状态 -->
        <template v-if="user">
          <UiCard class="p-[20px]">
            <div class="flex items-center gap-[16px]">
              <div class="flex size-[56px] items-center justify-center rounded-full bg-zinc-900 text-white text-[20px] font-medium">
                {{ user.phone?.slice(-2) }}
              </div>
              <div>
                <p class="text-[16px] font-medium text-zinc-900">{{ user.phone }}</p>
                <p class="text-[13px] text-zinc-500 mt-[4px]">已登录</p>
              </div>
            </div>
          </UiCard>

          <div class="mt-[24px]">
            <UiButton variant="outline" class="w-full" @click="handleLogout">退出登录</UiButton>
          </div>
        </template>

        <!-- 未登录状态 -->
        <template v-else>
          <div class="text-center mb-[32px]">
            <div class="mx-auto mb-[16px] flex size-[72px] items-center justify-center rounded-full bg-zinc-100">
              <span class="text-[32px]">👤</span>
            </div>
            <h2 class="text-[18px] font-medium text-zinc-900">登录账号</h2>
            <p class="text-[14px] text-zinc-500 mt-[8px]">登录后可跨设备同步历史记录</p>
          </div>

          <UiCard class="p-[20px]">
            <div class="flex flex-col gap-[16px]">
              <div>
                <label class="text-[13px] font-medium text-zinc-500 mb-[6px] block">手机号</label>
                <UiInput v-model="phone" placeholder="请输入手机号" type="tel" />
              </div>
              <div>
                <label class="text-[13px] font-medium text-zinc-500 mb-[6px] block">验证码</label>
                <div class="grid grid-cols-[1fr_auto] gap-[8px]">
                  <UiInput v-model="code" placeholder="请输入验证码" type="text" />
                  <UiButton variant="outline" :disabled="loading" @click="handleSendCode">
                    获取验证码
                  </UiButton>
                </div>
              </div>
              <p v-if="devCode" class="text-[12px] text-zinc-400">开发验证码：{{ devCode }}</p>
              <UiButton :disabled="loading || !phone || !code" @click="handleLogin">
                <LoaderCircle v-if="loading" class="size-[16px] animate-spin mr-[8px]" />
                登录
              </UiButton>
            </div>
          </UiCard>
        </template>
      </div>
    </div>
  </main>
</template>
