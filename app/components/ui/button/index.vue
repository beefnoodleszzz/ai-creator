<script setup lang="ts">
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '~/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-[6px] rounded-[10px] text-[14px] font-medium transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]',
  {
    variants: {
      variant: {
        default: 'bg-zinc-900 text-white hover:bg-zinc-800 shadow-sm',
        outline: 'border border-zinc-200/80 bg-white text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300',
        ghost: 'text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-900',
        destructive: 'bg-red-500 text-white hover:bg-red-600',
      },
      size: {
        sm: 'h-[32px] px-[10px] text-[13px]',
        md: 'h-[36px] px-[14px] text-[14px]',
        lg: 'h-[44px] px-[20px] text-[15px]',
        icon: 'size-[36px] p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
)

const props = defineProps<{
  variant?: VariantProps<typeof buttonVariants>['variant']
  size?: VariantProps<typeof buttonVariants>['size']
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
}>()
</script>

<template>
  <button
    :type="props.type || 'button'"
    :disabled="disabled"
    :class="cn(buttonVariants({ variant: props.variant, size: props.size }))"
  >
    <slot />
  </button>
</template>
