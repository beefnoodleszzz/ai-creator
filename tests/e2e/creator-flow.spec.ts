import { expect, test } from '@playwright/test'

test('can reach tone step from homepage', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: '小红书 图文笔记' }).click()
  await page.getByRole('button', { name: /美食探店/ }).click()
  await page.getByRole('button', { name: /网红店打卡/ }).click()

  await expect(page.getByRole('button', { name: '一键生成爆款文案' })).toBeVisible()
})

test('ops page is accessible', async ({ page }) => {
  await page.goto('/ops')
  await expect(page.getByRole('heading', { name: '运营看板' })).toBeVisible()
})
