<script setup lang="ts">
import {
  DatePickerRoot,
  DatePickerTrigger,
  DatePickerContent,
  DatePickerCalendar,
  DatePickerCell,
  DatePickerCellTrigger,
  DatePickerGrid,
  DatePickerGridBody,
  DatePickerGridRow,
  DatePickerGridHead,
  DatePickerHeadCell,
  DatePickerHeader,
  DatePickerHeading,
  DatePickerNext,
  DatePickerPrev,
} from 'radix-vue'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { parseDate, today, getLocalTimeZone, type DateValue } from '@internationalized/date'
import { cn } from '~/lib/utils'

const props = defineProps<{
  modelValue?: string
  placeholder?: string
  class?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const placeholderDate = ref(today(getLocalTimeZone()))

const dateValue = computed<DateValue | undefined>({
  get() {
    if (!props.modelValue) return undefined
    try {
      return parseDate(props.modelValue)
    } catch {
      return undefined
    }
  },
  set(value) {
    emit('update:modelValue', value ? value.toString() : '')
  },
})

const displayText = computed(() => {
  if (!dateValue.value) return props.placeholder || '选择日期'
  return dateValue.value.toDate(getLocalTimeZone()).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
})
</script>

<template>
  <DatePickerRoot
    v-model="dateValue"
    v-model:placeholder="placeholderDate"
    :weekday-format="'short'"
    :fixed-weeks="true"
  >
    <DatePickerTrigger
      :class="cn(
        'flex h-[36px] w-full items-center justify-between rounded-[10px] border border-zinc-200/80 bg-white px-[12px] py-[8px]',
        'text-[14px] text-zinc-900 transition-all duration-200',
        'focus:outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-950/5',
        props.class,
      )"
    >
      <span :class="dateValue ? 'text-zinc-900' : 'text-zinc-400'">{{ displayText }}</span>
      <CalendarIcon class="size-[14px] text-zinc-400" />
    </DatePickerTrigger>

    <DatePickerContent class="z-50 rounded-[12px] border border-zinc-200/80 bg-white p-[8px] shadow-elevated">
      <DatePickerCalendar v-slot="{ weekDays, grid }">
        <DatePickerHeader class="mb-[6px] flex items-center justify-between">
          <DatePickerPrev class="inline-flex size-[28px] items-center justify-center rounded-[8px] border border-zinc-200 text-zinc-500 hover:bg-zinc-50">
            <ChevronLeft class="size-[14px]" />
          </DatePickerPrev>
          <DatePickerHeading class="text-[13px] font-medium text-zinc-800" />
          <DatePickerNext class="inline-flex size-[28px] items-center justify-center rounded-[8px] border border-zinc-200 text-zinc-500 hover:bg-zinc-50">
            <ChevronRight class="size-[14px]" />
          </DatePickerNext>
        </DatePickerHeader>

        <div class="flex flex-col gap-[6px]">
          <DatePickerGrid v-for="month in grid" :key="month.value.toString()">
            <DatePickerGridHead>
              <DatePickerGridRow class="mb-[2px] grid grid-cols-7 gap-[2px]">
                <DatePickerHeadCell
                  v-for="day in weekDays"
                  :key="day"
                  class="text-center text-[11px] text-zinc-500"
                >
                  {{ day }}
                </DatePickerHeadCell>
              </DatePickerGridRow>
            </DatePickerGridHead>

            <DatePickerGridBody>
              <DatePickerGridRow
                v-for="(weekDates, index) in month.rows"
                :key="`weekDate-${index}`"
                class="grid grid-cols-7 gap-[2px]"
              >
                <DatePickerCell
                  v-for="weekDate in weekDates"
                  :key="weekDate.toString()"
                  :date="weekDate"
                >
                  <DatePickerCellTrigger
                    :day="weekDate"
                    :month="month.value"
                    class="inline-flex size-[30px] items-center justify-center rounded-[8px] text-[12px] text-zinc-700 outline-none transition-colors hover:bg-zinc-100 data-[selected]:bg-zinc-900 data-[selected]:text-white data-[outside-view]:text-zinc-300"
                  />
                </DatePickerCell>
              </DatePickerGridRow>
            </DatePickerGridBody>
          </DatePickerGrid>
        </div>
      </DatePickerCalendar>
    </DatePickerContent>
  </DatePickerRoot>
</template>

