<template>
  <a-modal
    :open="open"
    :title="t('result.addHotel')"
    :footer="null"
    width="560px"
    @update:open="(v: boolean) => emit('update:open', v)"
  >
    <a-tabs v-model:activeKey="tab">
      <a-tab-pane key="search" :tab="t('result.addBySearch')">
        <a-input-search
          v-model:value="keyword"
          :placeholder="t('result.hotelSearchPlaceholder')"
          :loading="searching"
          :enter-button="t('result.poiSearchButton')"
          @search="doSearch"
        />
        <div class="poi-result-list">
          <a-empty
            v-if="!results.length && !searching"
            :image-style="{ height: '48px' }"
            :description="t('result.poiSearchEmpty')"
          />
          <div
            v-for="poi in results"
            :key="poi.id || poi.name"
            class="poi-result-item"
            @click="pickPoi(poi)"
          >
            <div class="poi-name">{{ poi.name }}</div>
            <div class="poi-sub">{{ poi.address }}</div>
            <div class="poi-sub poi-type">{{ poi.type }}</div>
          </div>
        </div>
      </a-tab-pane>

      <a-tab-pane key="manual" :tab="t('result.addManually')">
        <a-form layout="vertical">
          <a-form-item :label="t('result.fieldName')" required>
            <a-input v-model:value="form.name" />
          </a-form-item>
          <a-form-item :label="t('result.fieldAddress')">
            <a-input v-model:value="form.address" />
          </a-form-item>
          <a-form-item :label="t('result.fieldType')">
            <a-input v-model:value="form.type" :placeholder="t('result.hotelTypePlaceholder')" />
          </a-form-item>
          <a-form-item :label="t('result.fieldPriceRange')">
            <a-input v-model:value="form.price_range" :placeholder="t('result.hotelPriceRangePlaceholder')" />
          </a-form-item>
          <a-form-item :label="t('result.fieldPerNightCost')">
            <a-input-number v-model:value="form.estimated_cost" :min="0" style="width: 100%" />
          </a-form-item>
          <a-form-item :label="t('result.fieldRating')">
            <a-input v-model:value="form.rating" placeholder="4.5" />
          </a-form-item>
          <a-button type="primary" block @click="submit">
            {{ t('result.confirmAdd') }}
          </a-button>
        </a-form>
      </a-tab-pane>
    </a-tabs>
  </a-modal>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { message } from 'ant-design-vue'
import { searchPoi } from '@/services/api'
import type { Hotel, POISearchItem } from '@/types'

const props = defineProps<{
  open: boolean
  city: string
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'add', hotel: Hotel): void
}>()

const { t } = useI18n()

const tab = ref<'search' | 'manual'>('search')
const keyword = ref('')
const searching = ref(false)
const results = ref<POISearchItem[]>([])

const form = reactive<{
  name: string
  address: string
  type: string
  price_range: string
  estimated_cost: number
  rating: string
  distance: string
  location: { longitude: number; latitude: number } | null
}>({
  name: '',
  address: '',
  type: '',
  price_range: '',
  estimated_cost: 0,
  rating: '',
  distance: '',
  location: null,
})

const resetForm = () => {
  tab.value = 'search'
  keyword.value = ''
  results.value = []
  form.name = ''
  form.address = ''
  form.type = ''
  form.price_range = ''
  form.estimated_cost = 0
  form.rating = ''
  form.distance = ''
  form.location = null
}

watch(
  () => props.open,
  (visible) => {
    if (visible) resetForm()
  }
)

const doSearch = async () => {
  const kw = keyword.value.trim()
  if (!kw) return
  searching.value = true
  try {
    results.value = await searchPoi(kw, props.city)
    if (!results.value.length) {
      message.info(t('result.poiSearchNoResult'))
    }
  } catch (err) {
    console.error('住宿POI搜索失败:', err)
    message.error(t('result.poiSearchFailed'))
  } finally {
    searching.value = false
  }
}

/** 选中搜索结果：回填表单并切到手动 tab 补充价格/评分等 */
const pickPoi = (poi: POISearchItem) => {
  form.name = poi.name
  form.address = poi.address || ''
  form.type = poi.type || ''
  form.location = poi.location
    ? { longitude: poi.location.longitude, latitude: poi.location.latitude }
    : null
  tab.value = 'manual'
}

const submit = () => {
  const name = form.name.trim()
  if (!name) {
    message.warning(t('result.manualNameRequired'))
    return
  }
  emit('add', {
    name,
    address: form.address.trim(),
    location: form.location ?? undefined,
    type: form.type.trim(),
    price_range: form.price_range.trim(),
    estimated_cost: form.estimated_cost || 0,
    rating: form.rating.trim(),
    distance: form.distance.trim(),
  })
  emit('update:open', false)
}
</script>
