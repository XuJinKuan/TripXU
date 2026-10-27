<template>
  <a-modal
    :open="open"
    :title="t('result.addMeal')"
    :footer="null"
    width="560px"
    @update:open="(v: boolean) => emit('update:open', v)"
  >
    <a-tabs v-model:activeKey="tab">
      <a-tab-pane key="search" :tab="t('result.addBySearch')">
        <a-input-search
          v-model:value="keyword"
          :placeholder="t('result.mealSearchPlaceholder')"
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
          <a-form-item :label="t('result.fieldMealType')">
            <a-select v-model:value="form.type" :options="mealTypeOptions" />
          </a-form-item>
          <a-form-item :label="t('result.fieldAddress')">
            <a-input v-model:value="form.address" />
          </a-form-item>
          <a-form-item :label="t('result.fieldPerPersonCost')">
            <a-input-number v-model:value="form.estimated_cost" :min="0" style="width: 100%" />
          </a-form-item>
          <a-form-item :label="t('result.fieldRelatedAttraction')">
            <a-select
              v-model:value="form.related_attraction"
              :options="relatedOptions"
              allow-clear
              :placeholder="t('result.fieldRelatedAttractionNone')"
            />
          </a-form-item>
          <a-form-item :label="t('result.fieldDescription')">
            <a-textarea v-model:value="form.description" :rows="2" />
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
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { message } from 'ant-design-vue'
import { searchPoi } from '@/services/api'
import type { Meal, POISearchItem } from '@/types'

const props = defineProps<{
  open: boolean
  city: string
  /** 当天景点名列表，用于「关联景点」下拉 */
  attractions: string[]
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'add', meal: Meal): void
}>()

const { t } = useI18n()

const tab = ref<'search' | 'manual'>('search')
const keyword = ref('')
const searching = ref(false)
const results = ref<POISearchItem[]>([])

const form = reactive<{
  name: string
  type: Meal['type']
  address: string
  estimated_cost: number
  description: string
  related_attraction: string | undefined
  location: { longitude: number; latitude: number } | null
}>({
  name: '',
  type: 'lunch',
  address: '',
  estimated_cost: 0,
  description: '',
  related_attraction: undefined,
  location: null,
})

const mealTypeOptions = computed(() => [
  { value: 'breakfast', label: t('result.meals.breakfast') },
  { value: 'lunch', label: t('result.meals.lunch') },
  { value: 'dinner', label: t('result.meals.dinner') },
  { value: 'snack', label: t('result.meals.snack') },
])

const relatedOptions = computed(() =>
  props.attractions.filter(Boolean).map((name) => ({ value: name, label: name }))
)

const resetForm = () => {
  tab.value = 'search'
  keyword.value = ''
  results.value = []
  form.name = ''
  form.type = 'lunch'
  form.address = ''
  form.estimated_cost = 0
  form.description = ''
  form.related_attraction = undefined
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
    console.error('餐饮POI搜索失败:', err)
    message.error(t('result.poiSearchFailed'))
  } finally {
    searching.value = false
  }
}

/** 选中搜索结果：回填表单并切到手动 tab 补充餐次/人均/关联景点 */
const pickPoi = (poi: POISearchItem) => {
  form.name = poi.name
  form.address = poi.address || ''
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
    type: form.type,
    name,
    address: form.address.trim() || undefined,
    location: form.location ?? undefined,
    description: form.description.trim() || undefined,
    estimated_cost: form.estimated_cost || 0,
    related_attraction: form.related_attraction || undefined,
  })
  emit('update:open', false)
}
</script>
